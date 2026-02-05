from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone
from .models import Sale, SaleItem, Shift
from .serializers import SaleSerializer, CreateSaleSerializer, ShiftSerializer
from inventory.models import Product

# Sale views
class SaleListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateSaleSerializer
        return SaleSerializer
    
    def get_queryset(self):
        return Sale.objects.filter(business=self.request.user.business)
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Check if user has business
        if not request.user.business_id:
            return Response({'error': 'User not assigned to a business'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Add business and cashier to request data
        request.data.update({
            'business': request.user.business_id,
            'cashier': request.user.id,
        })
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update product stock
        sale = serializer.save()
        for item in sale.items.all():
            product = item.product
            if product:
                product.current_stock -= item.quantity
                product.save()
        
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

class SaleDetailView(generics.RetrieveAPIView):
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Sale.objects.filter(business=self.request.user.business)

# Shift management
class ShiftListCreateView(generics.ListCreateAPIView):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Shift.objects.filter(cashier=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(cashier=self.request.user, business=self.request.user.business)

class ShiftDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Shift.objects.filter(cashier=self.request.user)

# Open/close shift endpoints
class OpenShiftView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Check if shift already open
        if user.current_shift_open:
            return Response({'error': 'Shift already open'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create shift
        shift = Shift.objects.create(
            business=user.business,
            cashier=user,
            shift_number=f"SHIFT-{timezone.now().strftime('%Y%m%d-%H%M%S')}",
            start_time=timezone.now(),
            starting_cash=request.data.get('starting_cash', 0.00),
            is_active=True
        )
        
        # Update user shift status
        user.current_shift_open = True
        user.current_shift_start = timezone.now()
        user.current_shift_float = shift.starting_cash
        user.save()
        
        return Response(ShiftSerializer(shift).data, status=status.HTTP_201_CREATED)

class CloseShiftView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        if not user.current_shift_open:
            return Response({'error': 'No open shift'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get active shift
        shift = Shift.objects.filter(cashier=user, is_active=True).first()
        if not shift:
            return Response({'error': 'Shift not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Update shift
        shift.end_time = timezone.now()
        shift.is_active = False
        shift.actual_cash = request.data.get('actual_cash', 0.00)
        shift.calculate_expected_cash()
        shift.calculate_difference()
        
        if request.data.get('reconcile', False):
            shift.reconciled_by = request.user
            shift.reconciled_at = timezone.now()
        
        shift.save()
        
        # Update user
        user.current_shift_open = False
        user.current_shift_start = None
        user.current_shift_float = 0.00
        user.save()
        
        return Response(ShiftSerializer(shift).data)