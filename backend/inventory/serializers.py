from rest_framework import serializers
from .models import Category, Product, StockMovement

# Category serializer
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at']

# Product serializer with computed fields
class ProductSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'sku', 'name', 'description', 'category', 'category_name',
                  'cost_price', 'selling_price', 'profit_margin', 'current_stock',
                  'minimum_stock', 'maximum_stock', 'status', 'barcode',
                  'is_low_stock', 'is_out_of_stock', 'created_at', 'updated_at']
        read_only_fields = ['profit_margin', 'created_at', 'updated_at']

# Stock movement serializer
class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = ['id', 'product', 'product_name', 'movement_type', 'quantity',
                  'previous_quantity', 'new_quantity', 'reference', 'notes',
                  'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['previous_quantity', 'new_quantity', 'created_at']