from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import date
from .models import DailySummary
from .ai_service import ai_analyzer

# Import notification helper
from notifications.views import send_business_notification
from notifications.models import Notification

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
            # Prepare notification message based on insights
            insights = summary.insights or {}
            profitability = insights.get('profitability', 'needs_attention')
            sales_trend = insights.get('sales_trend', 'stable')
            
            if profitability == 'good' and sales_trend == 'increasing':
                notification_title = '📈 Great Day!'
                notification_message = f"Your business had an excellent day on {target_date}! Sales are up and profitable."
            elif profitability == 'good':
                notification_title = '✅ Profitable Day'
                notification_message = f"Your business was profitable on {target_date}. Check your AI summary for details."
            else:
                notification_title = '📊 Daily Summary Ready'
                notification_message = f"Your AI business summary for {target_date} is ready with insights and recommendations."
            
            # Send notification
            send_business_notification(
                business=business,
                title=notification_title,
                message=notification_message,
                notification_type='summary',
                data={
                    'summary_id': summary.id,
                    'date': target_date.isoformat(),
                    'profitability': profitability,
                    'sales_trend': sales_trend,
                    'net_profit': float(summary.net_profit),
                }
            )
            
            return Response({
                'success': True,
                'message': 'AI summary generated successfully',
                'summary': summary.ai_summary,
                'insights': summary.insights,
                'recommendations': summary.recommendations,
                'date': summary.date.isoformat(),
                'notification_sent': True,
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
        
        # Check for unread notifications
        unread_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        return Response({
            'success': True,
            'count': len(data),
            'summaries': data,
            'unread_notifications': unread_count,
        })

# Add function to send periodic business alerts
def send_periodic_business_alerts(business):
    """Send periodic alerts based on business performance"""
    today = timezone.now().date()
    
    # Check for zero sales day
    today_sales = Sale.objects.filter(
        business=business,
        created_at__date=today,
        status='completed'
    ).count()
    
    if today_sales == 0 and timezone.now().hour >= 15:  # After 3 PM with no sales
        send_business_notification(
            business=business,
            title='⚠️ No Sales Today',
            message="It's 3 PM and you haven't recorded any sales today. Check if everything is okay.",
            notification_type='alert',
            data={'alert_type': 'no_sales', 'time': timezone.now().isoformat()}
        )
    
    # Check for high-value sale opportunity (based on time of day)
    if timezone.now().hour in [10, 14, 17]:  # Peak hours
        send_business_notification(
            business=business,
            title='⏰ Peak Hour Reminder',
            message=f"It's {timezone.now().strftime('%I:%M %p')} - a peak business hour. Ensure staff are prepared!",
            notification_type='alert',
            data={'alert_type': 'peak_hour', 'hour': timezone.now().hour}
        )