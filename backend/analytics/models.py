from django.db import models
from django.utils import timezone

# Daily business summary for AI insights
class DailySummary(models.Model):
    business = models.ForeignKey('business.Business', on_delete=models.CASCADE)
    date = models.DateField()
    
    # Key metrics
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Counts
    transactions_count = models.IntegerField(default=0)
    new_customers = models.IntegerField(default=0)
    
    # Inventory
    low_stock_items = models.IntegerField(default=0)
    out_of_stock_items = models.IntegerField(default=0)
    
    # AI generated content
    ai_summary = models.TextField(blank=True)  # Natural language summary
    insights = models.JSONField(default=dict)  # Structured insights from AI
    recommendations = models.TextField(blank=True)
    
    # Processing status
    is_processed = models.BooleanField(default=False)  # AI processed this day
    processed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['business', 'date']  # One summary per business per day
        ordering = ['-date']
    
    def __str__(self):
        return f"Summary {self.date} - {self.business.name}"
    
    # Calculate net profit
    def save(self, *args, **kwargs):
        self.net_profit = self.total_sales - self.total_expenses
        super().save(*args, **kwargs)
    
    def generate_ai_summary(self):
        """Generate and save AI summary"""
        try:
            from .ai_service import ai_analyzer
            ai_result = ai_analyzer.generate_daily_summary(self.business, self.date)
            self.ai_summary = ai_result['ai_summary']
            self.insights = ai_result['insights']
            self.recommendations = '\n'.join(ai_result['recommendations'])
            self.is_processed = True
            self.processed_at = timezone.now()
            self.save()
            return True
        except Exception as e:
            print(f"AI summary generation failed: {e}")
            return False