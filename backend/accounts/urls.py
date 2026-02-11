from django.urls import path
from .views import CustomTokenObtainPairView, RegisterView, ProfileView, LogoutView
from .views_users import EmployeeListView, EmployeeCreateView, EmployeeDetailView, EmployeeResetPasswordView

urlpatterns = [
    # Auth endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'), 
    path('profile/', ProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # Employee management endpoints
    path('users/', EmployeeListView.as_view(), name='employee-list'),
    path('users/', EmployeeCreateView.as_view(), name='employee-create'),
    path('users/<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),
    path('users/<int:pk>/reset-password/', EmployeeResetPasswordView.as_view(), name='employee-reset-password'),
]