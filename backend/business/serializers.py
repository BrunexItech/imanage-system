from rest_framework import serializers
from .models import Business

# Business serializer
class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'name', 'registration_number', 'business_type', 
                  'email', 'phone', 'address', 'country', 'currency', 
                  'timezone_field', 'tax_rate', 'receipt_footer', 'created_at']
        read_only_fields = ['created_at']