from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MasterCompanyViewSet, 
    MasterPlanViewSet, 
    MasterInstanceViewSet, 
    MasterFinanceViewSet,
    CreateStripeCheckoutSessionView,
    StripeWebhookView
)

from users.views import MasterUserViewSet

router = DefaultRouter()
router.register(r'companies', MasterCompanyViewSet, basename='master-company')
router.register(r'plans', MasterPlanViewSet, basename='master-plan')
router.register(r'instances', MasterInstanceViewSet, basename='master-instance')
router.register(r'finance', MasterFinanceViewSet, basename='master-finance')
router.register(r'users', MasterUserViewSet, basename='master-user')

urlpatterns = [
    path('checkout/', CreateStripeCheckoutSessionView.as_view(), name='stripe-checkout'),
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('', include(router.urls)),
]

