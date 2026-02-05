from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse

@api_view(['GET'])
def api_root(request, format=None):
    """
    API root endpoint showing available endpoints.
    """
    return Response({
        'auth': {
            'register': reverse('register', request=request, format=format),
            'login': reverse('login', request=request, format=format),
            'profile': reverse('profile', request=request, format=format),
            'logout': reverse('logout', request=request, format=format),
        },
        'business': reverse('business-list', request=request, format=format),
        'inventory': {
            'products': reverse('product-list', request=request, format=format),
            'categories': reverse('category-list', request=request, format=format),
            'low_stock': reverse('low-stock', request=request, format=format),
        },
        'sales': {
            'sales': reverse('sale-list', request=request, format=format),
            'shifts': reverse('shift-list', request=request, format=format),
        },
        'payments': {
            'methods': reverse('payment-method-list', request=request, format=format),
            'expenses': reverse('expense-list', request=request, format=format),
            'mobile_money': reverse('mobile-money-pay', request=request, format=format),
        },
        'analytics': {
            'dashboard': reverse('dashboard', request=request, format=format),
            'sales_trend': reverse('sales-trend', request=request, format=format),
            'daily_summaries': reverse('daily-summary-list', request=request, format=format),
        }
    })