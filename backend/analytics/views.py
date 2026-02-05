from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from .models import DailySummary
from .serializers import DailySummarySerializer
from sales.models import Sale
from inventory.models import Product
from payments.models import Expense
from django.db import models 

# Daily summary views
class DailySummaryListView(generics.ListAPIView):
    serializer_class = DailySummarySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DailySummary.objects.filter(
            business=self.request.user.business
        ).order_by('-date')

class DailySummaryDetailView(generics.RetrieveAPIView):
    serializer_class = DailySummarySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DailySummary.objects.filter(business=self.request.user.business)

# Real-time dashboard data
class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        business = request.user.business
        today = timezone.now().date()
        
        # Today's sales
        today_sales = Sale.objects.filter(
            business=business,
            created_at__date=today,
            status='completed'
        ).aggregate(
            total=Sum('total_amount'),
            count=Count('id'),
            avg=Avg('total_amount')
        )
        
        # Today's expenses
        today_expenses = Expense.objects.filter(
            business=business,
            created_at__date=today
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Low stock items
        low_stock = Product.objects.filter(
            business=business,
            current_stock__lte=models.F('minimum_stock')
        ).count()
        
        # Recent transactions
        recent_sales = Sale.objects.filter(
            business=business
        ).order_by('-created_at')[:10].values(
            'id', 'receipt_number', 'total_amount', 'created_at'
        )
        
        return Response({
            'today_sales': today_sales['total'] or 0,
            'today_transactions': today_sales['count'] or 0,
            'avg_transaction': today_sales['avg'] or 0,
            'today_expenses': today_expenses,
            'today_profit': (today_sales['total'] or 0) - today_expenses,
            'low_stock_items': low_stock,
            'recent_sales': list(recent_sales),
        })

# Sales trend (last 7 days)
class SalesTrendView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        business = request.user.business
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        # Get daily sales for last 7 days
        daily_sales = Sale.objects.filter(
            business=business,
            created_at__date__range=[start_date, end_date],
            status='completed'
        ).values('created_at__date').annotate(
            total=Sum('total_amount'),
            count=Count('id')
        ).order_by('created_at__date')
        
        return Response({
            'period': {'start': start_date, 'end': end_date},
            'daily_sales': list(daily_sales)
        })