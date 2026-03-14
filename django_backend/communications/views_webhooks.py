import json
import logging
from django.http import HttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Message
from saas_master.models import Instance
from crm.models import Contact
from rest_framework_simplejwt.authentication import JWTAuthentication
from .whatsapp_service import send_text_message
from .tasks import process_chatbot_step

logger = logging.getLogger(__name__)

class WhatsAppWebhookView(APIView):
    """
    Recebe webhooks da Evolution API.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        body = request.data
        
        # O Evolution manda o nome da instancia no payload e o evento
        event = body.get('event')
        instance_name = body.get('instance')
        
        if event == 'messages.upsert':
            data = body.get('data', {})
            message_info = data.get('message', {})
            key = data.get('key', {})
            
            # Ignorar mensagens enviadas por nós mesmos (fromMe)
            if key.get('fromMe'):
                return HttpResponse("Ignored fromMe", status=200)
                
            remote_jid = key.get('remoteJid', '')
            if '@g.us' in remote_jid:
                # Ignorar grupos por agora
                return HttpResponse("Ignored group", status=200)
                
            phone = remote_jid.split('@')[0]
            
            # Identificar o texto (pode vir em conversation ou extendedTextMessage)
            content = ""
            if 'conversation' in message_info:
                content = message_info['conversation']
            elif 'extendedTextMessage' in message_info:
                content = message_info['extendedTextMessage'].get('text', '')
            else:
                content = "[MEDIA/OTHER]"

            try:
                # 1. Encontrar Instância
                instance = Instance.objects.filter(name=instance_name).first()
                if not instance:
                    logger.warning(f"Instância não encontrada: {instance_name}")
                    return HttpResponse("Instance Not Found", status=404)
                
                # 2. Usuário Dono da Instância (assumindo o admin do tenant ou pegando pelo ID do user se houver relação direta)
                company = instance.company
                owner_profile = company.userprofile_set.first() # Depende da modelagem, mas assumimos o admin
                if not owner_profile:
                    # Alternativa: Pode ser ligado direto ao user? Atualmente a instância está ligada à Company.
                    from django.contrib.auth.models import User
                    owner_user = User.objects.filter(profile__company=company).first()
                else:
                    owner_user = owner_profile.user
                    
                if not owner_user:
                    logger.warning("No user found for company")
                    return HttpResponse("No user found", status=404)

                # 3. Contato
                push_name = data.get('pushName', phone)
                contact, _ = Contact.objects.get_or_create(
                    user=owner_user,
                    phone=phone,
                    defaults={'name': push_name}
                )

                # 4. Salvar Mensagem
                new_msg = Message.objects.create(
                    user=owner_user,
                    contact=contact,
                    content=content,
                    sender_type='client',
                    sender_name=push_name,
                    platform='whatsapp-evolution',
                    status='received'
                )
                
                # 5. Acionar Chatbot
                process_chatbot_step.delay(message_id=str(new_msg.id), instance_id=str(instance.id))

                return HttpResponse("EVENT_RECEIVED", status=200)
                
            except Exception as e:
                logger.error(f"Erro Webhook Evolution: {str(e)}")
                return HttpResponse("Internal Error", status=500)
                
        return HttpResponse("Event ignored", status=200)


class SendMessageView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        API interna para o React Frontend solicitar o envio de uma mensagem.
        """
        phone = request.data.get('phone')
        text = request.data.get('text')
        
        if not phone or not text:
            return Response({'error': 'phone e text são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

        # Determinar instância (usando a primeira disponível para a empresa do usuário)
        try:
            from saas_master.models import Instance
            user_company = getattr(request.user.profile, 'company', None)
            instance = Instance.objects.filter(company=user_company, status='CONNECTED').first()
            
            if not instance:
                return Response({'error': 'Nenhuma instância conectada encontrada.'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Formatar telefone (remover + e espaços) e adicionar sufixo
            formatted_phone = phone.replace("+", "").replace("-", "").replace(" ", "") + "@s.whatsapp.net"
            
            # Enviar via Evolution API
            result = send_text_message(
                phone=formatted_phone,
                text=text,
                instance_name=instance.name,
                api_key=instance.api_key
            )
            
            if "error" in result:
                return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            # Salvar no histórico
            # Assumindo que temos o contato, se não, deixamos nulo ou tentamos achar
            contact = Contact.objects.filter(user=request.user, phone__icontains=phone.replace("+", "")).first()
            
            Message.objects.create(
                user=request.user,
                contact=contact,
                content=text,
                sender_type='me',
                sender_name=request.user.get_full_name() or "Eu",
                platform='whatsapp-evolution'
            )
                
            return Response({'success': True, 'message': 'Mensagem enviada com sucesso!'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
