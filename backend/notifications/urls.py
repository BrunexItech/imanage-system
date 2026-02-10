from django.urls import path
from .views import (
    RegisterDeviceView,
    SendNotificationView,
    NotificationListView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    TestNotificationView  # ADD THIS IMPORT
)

urlpatterns = [
    path('register-device/', RegisterDeviceView.as_view(), name='register-device'),
    path('send/', SendNotificationView.as_view(), name='send-notification'),
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/mark-read/', MarkNotificationReadView.as_view(), name='mark-notification-read'),
    path('mark-all-read/', MarkAllNotificationsReadView.as_view(), name='mark-all-notifications-read'),
    path('test/', TestNotificationView.as_view(), name='test-notification'), 
]