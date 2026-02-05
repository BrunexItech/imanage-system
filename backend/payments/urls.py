from django.urls import path
from .views import (
    PaymentMethodListView, PaymentMethodDetailView,
    PaymentListView, ExpenseListView, ExpenseDetailView,
    MobileMoneyPaymentView
)

urlpatterns = [
    # Payment methods
    path('methods/', PaymentMethodListView.as_view(), name='payment-method-list'),
    path('methods/<int:pk>/', PaymentMethodDetailView.as_view(), name='payment-method-detail'),
    
    # Payments
    path('transactions/', PaymentListView.as_view(), name='payment-list'),
    
    # Expenses
    path('expenses/', ExpenseListView.as_view(), name='expense-list'),
    path('expenses/<int:pk>/', ExpenseDetailView.as_view(), name='expense-detail'),
    
    # Mobile money
    path('mobile-money/pay/', MobileMoneyPaymentView.as_view(), name='mobile-money-pay'),
]