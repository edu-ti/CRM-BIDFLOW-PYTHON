from rest_framework import serializers
from .models import ProductCategory, Brand, Depot, Unit, Size, Product, PriceTable, StockMovement

class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

class DepotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Depot
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')

class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    size_name = serializers.CharField(source='size.name', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

class PriceTableSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PriceTable
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')

class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    depot_name = serializers.CharField(source='depot.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ('id', 'user', 'date')
