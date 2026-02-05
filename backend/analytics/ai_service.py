import os
import json
import requests
from datetime import datetime, timedelta
from django.db import models
from django.conf import settings
from sales.models import Sale
from inventory.models import Product
from payments.models import Expense

class BusinessAIAnalyzer:
    def __init__(self):
        self.api_key = os.getenv('GROK_API_KEY', '')
        self.api_url = "https://api.x.ai/v1/chat/completions"
    
    def generate_daily_summary(self, business, date):
        """Generate AI summary for a business day"""
        
        # Get day's data
        start_date = datetime.combine(date, datetime.min.time())
        end_date = start_date + timedelta(days=1)
        
        sales = Sale.objects.filter(
            business=business,
            created_at__range=[start_date, end_date],
            status='completed'
        )
        
        expenses = Expense.objects.filter(
            business=business,
            created_at__range=[start_date, end_date]
        )
        
        low_stock = Product.objects.filter(
            business=business,
            current_stock__lte=models.F('minimum_stock')
        )
        
        # Prepare data
        data = {
            'date': date.isoformat(),
            'total_sales': float(sales.aggregate(total=models.Sum('total_amount'))['total'] or 0),
            'total_transactions': sales.count(),
            'average_sale': float(sales.aggregate(avg=models.Avg('total_amount'))['avg'] or 0),
            'total_expenses': float(expenses.aggregate(total=models.Sum('amount'))['total'] or 0),
            'low_stock_count': low_stock.count(),
            'top_products': list(sales.values('items__product__name').annotate(
                total_quantity=models.Sum('items__quantity')
            ).order_by('-total_quantity')[:5]),
            'expense_categories': list(expenses.values('category').annotate(
                total=models.Sum('amount')
            ))
        }
        
        # Generate AI summary via direct API call
        prompt = self._create_prompt(data)
        
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'model': 'grok-beta',
                'messages': [
                    {"role": "system", "content": "You are a business analyst providing concise, actionable insights."},
                    {"role": "user", "content": prompt}
                ],
                'temperature': 0.7,
                'max_tokens': 500
            }
            
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            summary = result['choices'][0]['message']['content']
            
            # Extract insights
            insights = self._extract_insights(summary)
            
            return {
                'ai_summary': summary,
                'insights': insights,
                'recommendations': self._generate_recommendations(data, insights)
            }
            
        except Exception as e:
            print(f"Grok API error: {e}")
            # Fallback
            return self._generate_fallback_summary(data)
    
    def _create_prompt(self, data):
        """Create prompt for AI"""
        return f"""
        Analyze this business data for {data['date']}:
        
        Sales Performance:
        - Total Sales: KES {data['total_sales']:.2f}
        - Number of Transactions: {data['total_transactions']}
        - Average Transaction: ${data['average_sale']:.2f}
        
        Expenses:
        - Total Expenses: ${data['total_expenses']:.2f}
        - Net Profit: ${data['total_sales'] - data['total_expenses']:.2f}
        
        Inventory:
        - Low Stock Items: {data['low_stock_count']}
        
        Top Products:
        {json.dumps(data['top_products'], indent=2)}
        
        Expense Categories:
        {json.dumps(data['expense_categories'], indent=2)}
        
        Provide a concise business summary explaining:
        1. What happened today
        2. Key insights (what went well, what didn't)
        3. 3 actionable recommendations
        4. Any alerts/concerns
        
        Keep it professional but conversational.
        """
    
    def _extract_insights(self, summary):
        """Extract structured insights from AI summary"""
        summary_lower = summary.lower()
        return {
            'profitability': 'good' if ('profit' in summary_lower and 'increase' in summary_lower) else 'needs_attention',
            'sales_trend': 'increasing' if ('increase' in summary_lower or 'up' in summary_lower) else 'stable',
            'inventory_health': 'good' if ('low stock' not in summary_lower) else 'needs_attention',
            'expense_control': 'good' if ('expense' in summary_lower and 'control' in summary_lower) else 'needs_attention'
        }
    
    def _generate_recommendations(self, data, insights):
        """Generate recommendations based on insights"""
        recommendations = []
        
        if data['low_stock_count'] > 0:
            recommendations.append(f"Restock {data['low_stock_count']} low inventory items")
        
        if data['total_expenses'] > (data['total_sales'] * 0.3):
            recommendations.append("Review expense categories for cost reduction")
        
        if data['average_sale'] < 50:
            recommendations.append("Consider upselling strategies to increase average transaction value")
        
        return recommendations
    
    def _generate_fallback_summary(self, data):
        """Generate summary when AI API fails"""
        profit = data['total_sales'] - data['total_expenses']
        
        return {
            'ai_summary': f"On {data['date']}, your business made ${data['total_sales']:.2f} in sales "
                         f"across {data['total_transactions']} transactions. Net profit was ${profit:.2f}. "
                         f"You have {data['low_stock_count']} items low in stock.",
            'insights': {
                'profitability': 'good' if profit > 0 else 'needs_attention',
                'sales_trend': 'stable',
                'inventory_health': 'good' if data['low_stock_count'] == 0 else 'needs_attention',
                'expense_control': 'good' if data['total_expenses'] < (data['total_sales'] * 0.3) else 'needs_attention'
            },
            'recommendations': [
                "Check inventory levels for low stock items",
                "Review daily sales reports regularly",
                "Monitor expense ratios"
            ]
        }

# Singleton instance
ai_analyzer = BusinessAIAnalyzer()