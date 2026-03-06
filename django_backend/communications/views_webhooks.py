import json
import logging
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import Message
from saas_master.models import Instance
from crm.models import Contact
from users.models import UserProfile

logger = logging.getLogger(__name__)

class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Handle Meta Webhook Verification (GET)"""
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        # Em produção, use settings.WHATSAPP_VERIFY_TOKEN
        VERIFY_TOKEN = "bidflow_whatsapp_token" 

        if mode == "subscribe" and token == VERIFY_TOKEN:
            return HttpResponse(challenge, status=200)
        return HttpResponse("Forbidden", status=403)

    def post(self, request):
        """Receive WhatsApp Message (POST)"""
        body = request.data
        # Removido log excessivo em prod, mas mantido para debug inicial
        # logger.info(f"WhatsApp Webhook Received: {json.dumps(body)}")

        if body.get("object") == "whatsapp_business_account":
            try:
                for entry in body.get("entry", []):
                    for change in entry.get("changes", []):
                        value = change.get("value", {})
                        if "messages" in value:
                            message_data = value["messages"][0]
                            phone_number_id = value["metadata"]["phone_number_id"]
                            from_phone = message_data["from"]
                            msg_type = message_data["type"]
                            
                            content = ""
                            if msg_type == "text":
                                content = message_data["text"]["body"]
                            else:
                                content = f"[{msg_type.upper()}]"

                            # 1. Encontrar Instância / Empresa
                            instance = Instance.objects.filter(whatsapp_phone_number_id=phone_number_id).first()
                            if not instance:
                                logger.warning(f"Instância não encontrada para phone_number_id: {phone_number_id}")
                                continue
                            
                            company = instance.company
                            
                            # 2. Encontrar o Usuário "Dono" ou Responsável
                            # Pegamos o primeiro admin ou o primeiro usuário da empresa
                            owner_profile = UserProfile.objects.filter(company=company).order_by('role').first()
                            if not owner_profile:
                                logger.warning(f"Nenhum usuário encontrado para a empresa: {company.name}")
                                continue
                            
                            owner_user = owner_profile.user

                            # 3. Encontrar ou Criar Contato
                            contact, created = Contact.objects.get_or_create(
                                user=owner_user,
                                phone=from_phone,
                                defaults={
                                    'name': value.get("contacts", [{}])[0].get("profile", {}).get("name", from_phone)
                                }
                            )

                            # 4. Salvar Mensagem no Banco Relacional
                            Message.objects.create(
                                user=owner_user,
                                contact=contact,
                                content=content,
                                sender_type='client',
                                sender_name=contact.name,
                                platform='whatsapp-meta',
                                status='received',
                                phone_number_id=phone_number_id
                            )

                return HttpResponse("EVENT_RECEIVED", status=200)
            except Exception as e:
                logger.error(f"Erro ao processar WhatsApp Webhook: {str(e)}")
                return HttpResponse("Internal Server Error", status=500)
        
        return HttpResponse("Not Found", status=404)
