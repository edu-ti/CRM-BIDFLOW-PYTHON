from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BankAccountViewSet, TransactionCategoryViewSet, TransactionViewSet

router = DefaultRouter()
router.register(r'bank-accounts', BankAccountViewSet, basename='bank-account')
router.register(r'categories', TransactionCategoryViewSet, basename='transaction-category')
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
]
