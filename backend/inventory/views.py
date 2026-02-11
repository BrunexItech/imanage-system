from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Product, StockMovement
from .serializers import CategorySerializer, ProductSerializer, StockMovementSerializer

# Category views
class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    
    def get_queryset(self):
        return Category.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)

class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Category.objects.filter(business=self.request.user.business)

# Product views
class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'status']
    search_fields = ['name', 'sku', 'barcode']
    
    def get_queryset(self):
        return Product.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Product.objects.filter(business=self.request.user.business)
    
    
# Add this after ProductDetailView
class ProductDeleteView(generics.DestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Product.objects.filter(business=self.request.user.business)
    
    def perform_destroy(self, instance):
        # Only owners and managers can delete products
        if self.request.user.role not in ['owner', 'manager']:
            raise permissions.PermissionDenied("Only owners and managers can delete products")
        instance.delete()


# Low stock alert endpoint
class LowStockProductsView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Product.objects.filter(
            business=self.request.user.business,
            current_stock__lte=models.F('minimum_stock')
        ).order_by('current_stock')

# Stock movement history
class StockMovementListView(generics.ListAPIView):
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return StockMovement.objects.filter(
            product__business=self.request.user.business
        ).order_by('-created_at')