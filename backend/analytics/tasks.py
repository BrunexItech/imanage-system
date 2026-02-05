from django.utils import timezone
from datetime import timedelta
from .models import DailySummary

def generate_daily_summaries():
    """Generate AI summaries for previous day"""
    yesterday = timezone.now().date() - timedelta(days=1)
    
    for summary in DailySummary.objects.filter(date=yesterday, is_processed=False):
        summary.generate_ai_summary()