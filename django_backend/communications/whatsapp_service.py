import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Base config (In production, these would be in environment variables)
EVOLUTION_BASE_URL = getattr(settings, 'EVOLUTION_API_URL', 'http://evolution_api:8080')
EVOLUTION_GLOBAL_API_KEY = getattr(settings, 'EVOLUTION_GLOBAL_API_KEY', 'g3st@03Du4rd0')

def get_headers(api_key=None):
    return {
        'apikey': api_key or EVOLUTION_GLOBAL_API_KEY,
        'Content-Type': 'application/json'
    }

def send_text_message(phone, text, instance_name, api_key=None):
    """
    Sende a text message to a specific phone number using a specific instance.
    """
    url = f"{EVOLUTION_BASE_URL}/message/sendText/{instance_name}"
    
    payload = {
        "number": phone,
        "options": {
            "delay": 1200,
            "presence": "composing"
        },
        "textMessage": {
            "text": text
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers(api_key))
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro ao enviar mensagem para {phone} via instância {instance_name}: {str(e)}")
        if hasattr(e, 'response') and e.response:
            logger.error(f"Detalhes do erro: {e.response.text}")
        return {"error": str(e)}

def send_media_message(phone, media_url, media_type, instance_name, caption="", api_key=None):
    """
    Send a media message (image, video, document, audio) to a phone number.
    """
    url = f"{EVOLUTION_BASE_URL}/message/sendMedia/{instance_name}"
    
    payload = {
        "number": phone,
        "options": {
            "delay": 1200,
            "presence": "composing"
        },
        "mediaMessage": {
            "mediatype": media_type,
            "caption": caption,
            "media": media_url
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers(api_key))
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro ao enviar media para {phone} via instância {instance_name}: {str(e)}")
        return {"error": str(e)}
