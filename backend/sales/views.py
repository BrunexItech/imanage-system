from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone
from .models import Sale, SaleItem, Shift
from .serializers import SaleSerializer, CreateSaleSerializer, ShiftSerializer
from inventory.models import Product

# Import notification helper
from notifications.views import send_business_notification

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
                
                # Check if product is now low stock
                if product.current_stock <= product.minimum_stock:
                    # Send low stock notification
                    send_business_notification(
                        business=request.user.business,
                        title='⚠️ Low Stock Alert',
                        message=f'{product.name} is low in stock. Current: {product.current_stock}, Min: {product.minimum_stock}',
                        notification_type='stock',
                        data={
                            'product_id': product.id,
                            'product_name': product.name,
                            'current_stock': product.current_stock,
                            'minimum_stock': product.minimum_stock,
                        }
                    )
        
        # Send WebSocket notification for real-time update
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'sales_{request.user.business_id}',
                {
                    'type': 'new_sale',
                    'sale': {
                        'id': sale.id,
                        'receipt_number': sale.receipt_number,
                        'total_amount': str(sale.total_amount),
                        'created_at': sale.created_at.isoformat(),
                    }
                }
            )
        except:
            pass  # WebSocket not configured, ignore
        
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
        shift = serializer.save(cashier=self.request.user, business=self.request.user.business)
        
        # Send shift notification
        send_business_notification(
            business=self.request.user.business,
            title='👤 Shift Started',
            message=f'{self.request.user.email} started shift {shift.shift_number}\nStarting cash: KES {shift.starting_cash:.2f}',
            notification_type='system',
            data={
                'shift_id': shift.id,
                'shift_number': shift.shift_number,
                'cashier': self.request.user.email,
                'starting_cash': str(shift.starting_cash),
            }
        )

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
        
        # Send shift notification
        send_business_notification(
            business=user.business,
            title='👤 Shift Started',
            message=f'{user.email} started shift {shift.shift_number}\nStarting cash: KES {shift.starting_cash:.2f}',
            notification_type='system',
            data={
                'shift_id': shift.id,
                'shift_number': shift.shift_number,
                'cashier': user.email,
                'starting_cash': str(shift.starting_cash),
            }
        )
        
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
        
        # Send shift closure notification
        difference_text = "✅ Balanced" if shift.difference == 0 else f"⚠️ Difference: KES {shift.difference:.2f}"
        
        send_business_notification(
            business=user.business,
            title='👤 Shift Closed',
            message=f'{user.email} closed shift {shift.shift_number}\nExpected: KES {shift.expected_cash:.2f}, Actual: KES {shift.actual_cash:.2f}\n{difference_text}',
            notification_type='system',
            data={
                'shift_id': shift.id,
                'shift_number': shift.shift_number,
                'cashier': user.email,
                'expected_cash': str(shift.expected_cash),
                'actual_cash': str(shift.actual_cash),
                'difference': str(shift.difference),
                'duration': str(shift.end_time - shift.start_time),
            }
        )
        
        return Response(ShiftSerializer(shift).data)

# Real-time sale count endpoint for dashboard
class TodaySalesCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        business = request.user.business
        today = timezone.now().date()
        
        count = Sale.objects.filter(
            business=business,
            created_at__date=today,
            status='completed'
        ).count()
        
        return Response({
            'date': today.isoformat(),
            'sales_count': count,
            'last_updated': timezone.now().isoformat()
        })