from django.contrib import admin
from django.urls import path, include
from . import views  # Import from same directory

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', views.api_root, name='api-root'),  
    path('api/auth/', include('accounts.urls')),
    path('api/business/', include('business.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/analytics/', include('analytics.urls')),
]