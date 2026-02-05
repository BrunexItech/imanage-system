from django.urls import path
from .views import BusinessListCreateView, BusinessDetailView

urlpatterns = [
    path('', BusinessListCreateView.as_view(), name='business-list'),
    path('<int:pk>/', BusinessDetailView.as_view(), name='business-detail'),
]