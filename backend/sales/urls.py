from django.urls import path
from .views import (
    SaleListCreateView, SaleDetailView,
    ShiftListCreateView, ShiftDetailView,
    OpenShiftView, CloseShiftView
)

urlpatterns = [
    # Sales
    path('sales/', SaleListCreateView.as_view(), name='sale-list'),
    path('sales/<int:pk>/', SaleDetailView.as_view(), name='sale-detail'),
    
    # Shifts
    path('shifts/', ShiftListCreateView.as_view(), name='shift-list'),
    path('shifts/<int:pk>/', ShiftDetailView.as_view(), name='shift-detail'),
    path('shifts/open/', OpenShiftView.as_view(), name='open-shift'),
    path('shifts/close/', CloseShiftView.as_view(), name='close-shift'),
]