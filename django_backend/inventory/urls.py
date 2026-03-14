from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductCategoryViewSet, BrandViewSet, DepotViewSet, 
    UnitViewSet, SizeViewSet, ProductViewSet, 
    PriceTableViewSet, StockMovementViewSet
)

router = DefaultRouter()
router.register(r'categories', ProductCategoryViewSet, basename='product-category')
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'depots', DepotViewSet, basename='depot')
router.register(r'units', UnitViewSet, basename='unit')
router.register(r'sizes', SizeViewSet, basename='size')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'pricing', PriceTableViewSet, basename='price-table')
router.register(r'movements', StockMovementViewSet, basename='stock-movement')

urlpatterns = [
    path('', include(router.urls)),
]
