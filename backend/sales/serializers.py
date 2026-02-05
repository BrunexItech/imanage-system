from rest_framework import serializers
from .models import Sale, SaleItem, Shift

# Sale item serializer
class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 
                  'total_price', 'cost_price', 'profit']
        read_only_fields = ['product_name', 'total_price', 'profit']

# Sale serializer with nested items
class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Sale
        fields = ['id', 'transaction_id', 'receipt_number', 'customer_name', 'customer_phone',
                  'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'amount_paid',
                  'change_given', 'status', 'status_display', 'payment_status', 'payment_status_display',
                  'cashier', 'cashier_name', 'shift', 'is_offline_sale', 'sync_status',
                  'offline_id', 'items', 'created_at', 'updated_at', 'synced_at']
        read_only_fields = ['transaction_id', 'created_at', 'updated_at', 'synced_at']

# Create sale with items
class CreateSaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    
    class Meta:
        model = Sale
        fields = ['business', 'receipt_number', 'customer_name', 'customer_phone', 'subtotal',
                  'tax_amount', 'discount_amount', 'total_amount', 'amount_paid',
                  'change_given', 'items', 'is_offline_sale', 'offline_id']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        sale = Sale.objects.create(**validated_data)
        
        # Create sale items
        for item_data in items_data:
            SaleItem.objects.create(sale=sale, **item_data)
        
        return sale

# Shift serializer
class ShiftSerializer(serializers.ModelSerializer):
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    reconciled_by_name = serializers.CharField(source='reconciled_by.get_full_name', read_only=True)
    
    class Meta:
        model = Shift
        fields = ['id', 'shift_number', 'cashier', 'cashier_name', 'start_time', 'end_time',
                  'is_active', 'starting_cash', 'expected_cash', 'actual_cash', 'difference',
                  'reconciled_by', 'reconciled_by_name', 'reconciled_at', 'notes', 'created_at']
        read_only_fields = ['expected_cash', 'difference', 'created_at']