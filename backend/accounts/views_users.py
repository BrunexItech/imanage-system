from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from .models import User
from .serializers import UserProfileSerializer, UserRegistrationSerializer

# List all employees for current business
class EmployeeListView(generics.ListAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only return users from same business
        return User.objects.filter(
            business=self.request.user.business
        ).exclude(
            id=self.request.user.id  # Exclude current user
        ).order_by('-date_joined')

# Create new employee (owner/manager only)
class EmployeeCreateView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        # Only owners and managers can create employees
        if self.request.user.role not in ['owner', 'manager']:
            raise permissions.PermissionDenied("Only owners and managers can create employees")
        
        # Auto-assign to current business
        serializer.save(business=self.request.user.business)

# Retrieve, update, delete employee
class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.filter(business=self.request.user.business)
    
    def perform_update(self, serializer):
        # Only owners and managers can update employees
        if self.request.user.role not in ['owner', 'manager']:
            raise permissions.PermissionDenied("Only owners and managers can update employees")
        serializer.save()
    
    def perform_destroy(self, instance):
        # Only owners can delete employees
        if self.request.user.role != 'owner':
            raise permissions.PermissionDenied("Only owners can delete employees")
        instance.is_active = False  # Soft delete
        instance.save()

# Reset employee password
class EmployeeResetPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        # Only owners and managers can reset passwords
        if request.user.role not in ['owner', 'manager']:
            return Response(
                {'error': 'Only owners and managers can reset passwords'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            employee = User.objects.get(pk=pk, business=request.user.business)
            new_password = request.data.get('password')
            
            if not new_password:
                return Response(
                    {'error': 'Password is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            employee.set_password(new_password)
            employee.save()
            
            return Response({'message': 'Password reset successful'})
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )