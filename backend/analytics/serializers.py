from rest_framework import serializers
from .models import DailySummary

# Daily summary serializer
class DailySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySummary
        fields = ['id', 'date', 'total_sales', 'total_expenses', 'net_profit',
                  'transactions_count', 'new_customers', 'low_stock_items',
                  'out_of_stock_items', 'ai_summary', 'insights', 'recommendations',
                  'is_processed', 'processed_at', 'created_at', 'updated_at']
        read_only_fields = ['is_processed', 'processed_at', 'created_at', 'updated_at']