from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import date
from .models import DailySummary
from .ai_service import ai_analyzer

class GenerateAISummaryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Generate AI summary for today or specified date"""
        business = request.user.business
        
        # Get date (default to today)
        target_date = request.data.get('date', timezone.now().date())
        if isinstance(target_date, str):
            target_date = date.fromisoformat(target_date)
        
        # Get or create daily summary
        summary, created = DailySummary.objects.get_or_create(
            business=business,
            date=target_date,
            defaults={
                'total_sales': 0,
                'total_expenses': 0,
                'transactions_count': 0,
            }
        )
        
        # Generate AI summary
        if summary.generate_ai_summary():
            return Response({
                'success': True,
                'message': 'AI summary generated successfully',
                'summary': summary.ai_summary,
                'insights': summary.insights,
                'recommendations': summary.recommendations,
                'date': summary.date.isoformat(),
            })
        else:
            return Response({
                'success': False,
                'message': 'Failed to generate AI summary',
                'date': summary.date.isoformat(),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GetAISummaryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get AI summary for date range"""
        business = request.user.business
        
        # Get date range (default last 7 days)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date', timezone.now().date())
        
        if start_date:
            summaries = DailySummary.objects.filter(
                business=business,
                date__range=[start_date, end_date],
                is_processed=True
            ).order_by('-date')
        else:
            # Last 7 days
            summaries = DailySummary.objects.filter(
                business=business,
                is_processed=True
            ).order_by('-date')[:7]
        
        data = []
        for summary in summaries:
            data.append({
                'date': summary.date.isoformat(),
                'ai_summary': summary.ai_summary,
                'insights': summary.insights,
                'recommendations': summary.recommendations.split('\n') if summary.recommendations else [],
                'metrics': {
                    'total_sales': float(summary.total_sales),
                    'total_expenses': float(summary.total_expenses),
                    'net_profit': float(summary.net_profit),
                    'transactions': summary.transactions_count,
                    'low_stock': summary.low_stock_items,
                }
            })
        
        return Response({
            'success': True,
            'count': len(data),
            'summaries': data,
        })