from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, CampaignViewSet, ChatbotFlowViewSet
from .views_webhooks import WhatsAppWebhookView, SendMessageView

router = DefaultRouter()
router.register(r'calendar/events', EventViewSet, basename='event')
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'chatbot', ChatbotFlowViewSet, basename='chatbot')

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/whatsapp/', WhatsAppWebhookView.as_view(), name='whatsapp-webhook'),
    path('send-message/', SendMessageView.as_view(), name='whatsapp-send'),
]
