from django.urls import path
from .views import (
    CategoryListCreateView, CategoryDetailView,
    ProductListCreateView, ProductDetailView, ProductDeleteView,
    LowStockProductsView, StockMovementListView
)

urlpatterns = [
    # Category endpoints
    path('categories/', CategoryListCreateView.as_view(), name='category-list'),
    path('categories/<int:pk>/', CategoryDetailView.as_view(), name='category-detail'),
    
    # Product endpoints
    path('products/', ProductListCreateView.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<int:pk>/delete/', ProductDeleteView.as_view(), name='product-delete'),
    path('products/low-stock/', LowStockProductsView.as_view(), name='product-low-stock'),
    
    # Stock movement
    path('stock-movements/', StockMovementListView.as_view(), name='stock-movement-list'),
]