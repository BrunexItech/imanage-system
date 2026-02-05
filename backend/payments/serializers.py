from rest_framework import serializers
from .models import PaymentMethod, Payment, Expense

# Payment method serializer
class PaymentMethodSerializer(serializers.ModelSerializer):
    method_type_display = serializers.CharField(source='get_method_type_display', read_only=True)
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    
    class Meta:
        model = PaymentMethod
        fields = ['id', 'name', 'method_type', 'method_type_display', 'provider', 'provider_display',
                  'merchant_code', 'is_active', 'created_at']
        read_only_fields = ['created_at']
        extra_kwargs = {
            'api_key': {'write_only': True},
            'api_secret': {'write_only': True}
        }

# Payment serializer
class PaymentSerializer(serializers.ModelSerializer):
    sale_receipt = serializers.CharField(source='sale.receipt_number', read_only=True)
    method_name = serializers.CharField(source='payment_method.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'sale', 'sale_receipt', 'payment_method', 'method_name', 'amount',
                  'transaction_fee', 'net_amount', 'provider_transaction_id', 'customer_phone',
                  'status', 'status_display', 'is_offline', 'created_at', 'completed_at']
        read_only_fields = ['net_amount', 'created_at', 'completed_at']

# Expense serializer
class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    paid_by_name = serializers.CharField(source='paid_by.get_full_name', read_only=True)
    
    class Meta:
        model = Expense
        fields = ['id', 'category', 'category_display', 'description', 'amount', 'paid_by',
                  'paid_by_name', 'payment_method', 'receipt_number', 'receipt_image', 'created_at']
        read_only_fields = ['created_at']