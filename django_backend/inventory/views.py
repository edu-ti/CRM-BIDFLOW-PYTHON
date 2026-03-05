from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.authentication import FirebaseAuthentication

from .models import (
    ProductCategory, Brand, Depot, Unit, Size, 
    Product, PriceTable, StockMovement
)
from .serializers import (
    ProductCategorySerializer, BrandSerializer, DepotSerializer, 
    UnitSerializer, SizeSerializer, ProductSerializer, 
    PriceTableSerializer, StockMovementSerializer
)

class BaseInventoryViewSet(viewsets.ModelViewSet):
    """
    Base viewset for all inventory models to ensure:
    1. Only authenticated users via Firebase can access.
    2. Querysets are filtered by the logged-in user.
    3. The user is automatically set on creation.
    """
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProductCategoryViewSet(BaseInventoryViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer


class BrandViewSet(BaseInventoryViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer


class DepotViewSet(BaseInventoryViewSet):
    queryset = Depot.objects.all()
    serializer_class = DepotSerializer


class UnitViewSet(BaseInventoryViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer


class SizeViewSet(BaseInventoryViewSet):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer


class ProductViewSet(BaseInventoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class PriceTableViewSet(BaseInventoryViewSet):
    queryset = PriceTable.objects.all()
    serializer_class = PriceTableSerializer


class StockMovementViewSet(BaseInventoryViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
