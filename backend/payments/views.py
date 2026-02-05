from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PaymentMethod, Payment, Expense
from .serializers import PaymentMethodSerializer, PaymentSerializer, ExpenseSerializer

# Payment method views
class PaymentMethodListView(generics.ListCreateAPIView):
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PaymentMethod.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)

class PaymentMethodDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PaymentMethod.objects.filter(business=self.request.user.business)

# Payment views
class PaymentListView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Payment.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)

# Expense views
class ExpenseListView(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Expense.objects.filter(business=self.request.user.business)
    
    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business, paid_by=self.request.user)

class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Expense.objects.filter(business=self.request.user.business)

# Mobile money payment simulation (for development)
class MobileMoneyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Simulate mobile money payment (replace with real API calls in production)
        data = request.data
        
        # Validate required fields
        required = ['amount', 'phone', 'payment_method_id']
        if not all(field in data for field in required):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # In production: Call M-Pesa/Airtel Money API here
        # For now, simulate successful payment
        payment_data = {
            'provider_transaction_id': f"MM_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            'status': 'completed',
            'transaction_fee': 10.00,  # Example fee
        }
        
        return Response({
            'success': True,
            'message': 'Payment simulated successfully',
            'data': payment_data
        })