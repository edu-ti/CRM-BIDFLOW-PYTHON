import logging
import time
from celery import shared_task
from .models import Campaign, Message, ChatbotFlow
from .whatsapp_service import send_text_message

logger = logging.getLogger(__name__)

@shared_task
def process_campaign_messages(campaign_id):
    """
    Processes an active campaign by sending messages to the target audience.
    """
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        if campaign.status != 'Ativa':
            logger.info(f"Campaign {campaign_id} is not Active. Status is {campaign.status}.")
            return "Campaign not active"
        
        # 1. Obter o público-alvo (Exemplo simplificado: usar os contactos todos ou filtrar pela tag "target_audience")
        # Numa implementação real faríamos um pull à tabela `crm.Contact` com base num filtro configurado na Campaign
        from crm.models import Contact
        
        if campaign.target_audience and campaign.target_audience != 'Todos':
            # Assumimos que o target_audience pode ser uma "tag" ou "origem"
            contacts = Contact.objects.filter(user=campaign.user, tags__icontains=campaign.target_audience)
        else:
            contacts = Contact.objects.filter(user=campaign.user)

        # 2. Obter a Instância (assumir a primeira instância ligada da empresa / user)
        # Numa implementação final, a Campaign pode ter uma foreign key para `saas_master.Instance`
        from saas_master.models import Instance
        
        # Procurar por uma instância do tenant (Company associada ao user)
        user_company = getattr(campaign.user.profile, 'company', None) if hasattr(campaign.user, 'profile') else None
        
        if not user_company:
             logger.error("User does not belong to a company/tenant.")
             return "No tenant found"
             
        instance = Instance.objects.filter(company=user_company, status='CONNECTED').first()
        
        if not instance:
            logger.error(f"No connected instance found for campaign {campaign_id}.")
            return "No connected instance"

        # 3. Iterar e Enviar
        success_count = 0
        for contact in contacts:
            if contact.phone:
                phone_formated = contact.phone.replace("+", "").replace("-", "").replace(" ", "")
                
                # Substituir Merge Tags
                msg_content = campaign.message_content.replace("{{nome}}", contact.name)
                
                logger.info(f"Sending campaign msg to {phone_formated}")
                
                # Chamar o serviço de WhatsApp
                send_text_message(
                    phone=phone_formated + "@s.whatsapp.net", # Formato Evolution API
                    text=msg_content,
                    instance_name=instance.name,
                    api_key=instance.api_key
                )
                
                # Criar o registo da mensagem na BD local para histórico
                Message.objects.create(
                    user=campaign.user,
                    contact=contact,
                    content=msg_content,
                    sender_type='me',
                    sender_name='Campaign Bot',
                    platform='whatsapp'
                )
                
                success_count += 1
                
                # Evitar block da Meta (Delay seguro)
                time.sleep(3) 

        # 4. Finalizar Campanha
        campaign.status = 'Concluída'
        campaign.save(update_fields=['status'])
        
        return f"Campaign processed. Sent {success_count} messages."

    except Campaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found.")
        return "Campaign not found"

@shared_task
def process_chatbot_step(message_id, instance_id):
    """
    Evaluates an incoming message and triggers matching Chatbot logic.
    """
    try:
        message = Message.objects.get(id=message_id)
        
        # Simple Example Logic: Find an active ChatbotFlow for the user
        flows = ChatbotFlow.objects.filter(user=message.user, is_active=True)
        
        if not flows.exists():
            return "No chatbot flows configured."
            
        # In a real scenario, we parse flow_data JSON, build the tree, match keywords
        # and trigger the next step.
        # For this MVP phase, we simulate a keyword interceptor matching "Agendar"
        
        incoming_text = message.content.lower().strip()
        
        if incoming_text == "oi" or incoming_text == "olá":
            reply_text = "Olá! Bem-vindo. Como posso ajudá-lo hoje? Responda com '1' para Vendas ou '2' para Suporte."
        elif incoming_text == "1":
            reply_text = "Ótimo. Um dos nossos comerciais falará consigo em breve."
        else:
            # Drop processing if no keyword match
            return "No keyword matched."
            
        # Obtain instance to reply (usually fetched from instance_id)
        from saas_master.models import Instance
        instance = Instance.objects.get(id=instance_id)
        
        # Enviar a resposta de volta ao cliente
        # Assumindo que message.sender_name guardou o number original ou que temos um campo phone
        # Se foi cliente, a contact string ou numero estará num campo. Como a BD atual tem contact associado, vamos lá:
        target_phone = getattr(message.contact, 'phone', None)
        
        if target_phone:
            phone_formated = target_phone.replace("+", "").replace("-", "").replace(" ", "") + "@s.whatsapp.net"
            send_text_message(
                phone=phone_formated,
                text=reply_text,
                instance_name=instance.name,
                api_key=instance.api_key
            )
            
            # Guardar resposta no histórico
            Message.objects.create(
                user=message.user,
                contact=message.contact,
                content=reply_text,
                sender_type='me',
                sender_name='Chatbot',
                platform='whatsapp'
            )
            
        return "Chatbot step executed."
            
    except Message.DoesNotExist:
         return "Message not found"
    except Exception as e:
         logger.error(f"Chatbot processing error: {str(e)}")
         return "Error processing chatbot logic"
