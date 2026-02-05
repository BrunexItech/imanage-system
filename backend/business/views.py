from rest_framework import generics, permissions
from .models import Business
from .serializers import BusinessSerializer

# Business list and create view
class BusinessListCreateView(generics.ListCreateAPIView):
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Filter by user's business or all for superuser
        if self.request.user.is_superuser:
            return Business.objects.all()
        return Business.objects.filter(id=self.request.user.business_id)
    
    def perform_create(self, serializer):
        # Auto-set created business for the user
        business = serializer.save()
        self.request.user.business = business
        self.request.user.save()

# Business detail view
class BusinessDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_superuser:
            return Business.objects.all()
        return Business.objects.filter(id=self.request.user.business_id)