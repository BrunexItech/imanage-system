from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from .models import DeviceToken, Notification
from .serializers import DeviceTokenSerializer, NotificationSerializer
import requests
import json
from django.conf import settings

# Firebase Cloud Messaging setup
FCM_URL = "https://fcm.googleapis.com/fcm/send"

def send_push_notification(device_tokens, title, message, data=None):
    """Send push notification to multiple devices"""
    if not device_tokens:
        return
    
    headers = {
        'Authorization': f'key={settings.FCM_SERVER_KEY}',
        'Content-Type': 'application/json',
    }
    
    payload = {
        'registration_ids': device_tokens,
        'notification': {
            'title': title,
            'body': message,
            'sound': 'default',
            'priority': 'high',
        },
        'data': data or {},
        'android': {
            'priority': 'high',
        },
        'apns': {
            'payload': {
                'aps': {
                    'sound': 'default',
                    'badge': 1,
                    'priority': 'high',
                }
            }
        }
    }
    
    try:
        response = requests.post(FCM_URL, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Failed to send push notification: {e}")
        return None

class RegisterDeviceView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Register a device token for push notifications"""
        token = request.data.get('token')
        device_type = request.data.get('device_type', 'android')
        
        if not token:
            return Response(
                {'error': 'Token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update or create device token
        device_token, created = DeviceToken.objects.update_or_create(
            token=token,
            defaults={
                'user': request.user,
                'device_type': device_type,
                'is_active': True
            }
        )
        
        # Deactivate other tokens for this user if needed (optional)
        # DeviceToken.objects.filter(user=request.user).exclude(token=token).update(is_active=False)
        
        serializer = DeviceTokenSerializer(device_token)
        return Response({
            'success': True,
            'message': 'Device registered successfully' if created else 'Device updated',
            'device': serializer.data
        })

class SendNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Send a notification to the current user"""
        user = request.user
        title = request.data.get('title', 'Imanage AI')
        message = request.data.get('message')
        notification_type = request.data.get('type', 'system')
        data = request.data.get('data', {})
        
        if not message:
            return Response(
                {'error': 'Message is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's active device tokens
        device_tokens = DeviceToken.objects.filter(
            user=user,
            is_active=True
        ).values_list('token', flat=True)
        
        if not device_tokens:
            return Response({
                'success': False,
                'message': 'No active devices found'
            })
        
        # Send push notification
        fcm_response = send_push_notification(
            list(device_tokens),
            title,
            message,
            {**data, 'type': notification_type}
        )
        
        # Store notification in database
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            data=data
        )
        
        return Response({
            'success': True,
            'message': 'Notification sent',
            'notification_id': notification.id,
            'fcm_response': fcm_response
        })

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by('-sent_at')

class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request, pk):
        """Mark a notification as read"""
        try:
            notification = Notification.objects.get(
                pk=pk,
                user=request.user
            )
            notification.mark_as_read()
            return Response({
                'success': True,
                'message': 'Notification marked as read'
            })
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class MarkAllNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Mark all notifications as read"""
        updated = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'success': True,
            'message': f'{updated} notifications marked as read'
        })

# Helper function to send business notifications
def send_business_notification(business, title, message, notification_type='system', data=None):
    """Send notification to all business owners/admins"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Get all users associated with this business
    users = User.objects.filter(business=business)
    
    for user in users:
        # Get user's active device tokens
        device_tokens = DeviceToken.objects.filter(
            user=user,
            is_active=True
        ).values_list('token', flat=True)
        
        if device_tokens:
            # Send push notification
            send_push_notification(
                list(device_tokens),
                title,
                message,
                {**(data or {}), 'type': notification_type}
            )
        
        # Store notification in database
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            data=data or {}
        )