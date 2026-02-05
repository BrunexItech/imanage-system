from django.urls import path
from .views import (
    DailySummaryListView, DailySummaryDetailView,
    DashboardView, SalesTrendView
)
from .views_ai import GenerateAISummaryView, GetAISummaryView  # Add this import

urlpatterns = [
    path('daily-summaries/', DailySummaryListView.as_view(), name='daily-summary-list'),
    path('daily-summaries/<int:pk>/', DailySummaryDetailView.as_view(), name='daily-summary-detail'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('sales-trend/', SalesTrendView.as_view(), name='sales-trend'),
    # AI endpoints
    path('ai/generate-summary/', GenerateAISummaryView.as_view(), name='generate-ai-summary'),
    path('ai/summaries/', GetAISummaryView.as_view(), name='get-ai-summaries'),
]