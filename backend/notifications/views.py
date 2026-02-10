from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from .models import DeviceToken, Notification
from .serializers import DeviceTokenSerializer, NotificationSerializer
import os
from django.conf import settings

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    from firebase_admin.exceptions import FirebaseError
    
    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully")
        else:
            print(f"Firebase credentials not found at: {cred_path}")
except ImportError:
    print("Firebase Admin SDK not installed")
    firebase_admin = None
    messaging = None

def send_push_notification(device_tokens, title, message, data=None, notification_type='system'):
    """Send push notification using Firebase Admin SDK"""
    if not device_tokens or not firebase_admin or not messaging:
        print("Cannot send notification: Firebase not initialized or no tokens")
        return None
    
    try:
        # Prepare message for multiple devices
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=message,
            ),
            data=data or {},
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    channel_id='imanage_alerts',
                    icon='imanageai_icon',
                    color='#1976d2',
                    tag=notification_type,  # Group notifications by type
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        sound='default',
                        badge=1,
                        category=notification_type,
                        thread_id=notification_type,
                    ),
                ),
            ),
            tokens=list(device_tokens),
        )
        
        # Send the message
        response = messaging.send_multicast(message)
        
        print(f"Successfully sent {response.success_count} notifications")
        if response.failure_count > 0:
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    print(f"Failed to send to token {device_tokens[idx]}: {resp.exception}")
        
        return {
            'success_count': response.success_count,
            'failure_count': response.failure_count,
            'responses': [
                {
                    'success': resp.success,
                    'message_id': resp.message_id if resp.success else None,
                    'error': str(resp.exception) if not resp.success else None
                }
                for resp in response.responses
            ]
        }
        
    except FirebaseError as e:
        print(f"Firebase error sending notification: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error sending notification: {e}")
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
        
        # Send welcome notification
        try:
            send_push_notification(
                [token],
                'Welcome to Imanage AI',
                'You will now receive real-time business notifications',
                {'type': 'welcome', 'user_id': str(request.user.id)},
                'system'
            )
        except:
            pass  # Don't fail registration if notification fails
        
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
            {**data, 'type': notification_type},
            notification_type
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
    
    all_tokens = []
    notifications_created = 0
    
    for user in users:
        # Get user's active device tokens
        device_tokens = DeviceToken.objects.filter(
            user=user,
            is_active=True
        ).values_list('token', flat=True)
        
        if device_tokens:
            all_tokens.extend(device_tokens)
        
        # Store notification in database
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            data=data or {}
        )
        notifications_created += 1
    
    # Send push notification to all tokens at once (more efficient)
    if all_tokens:
        send_push_notification(
            all_tokens,
            title,
            message,
            {**(data or {}), 'type': notification_type},
            notification_type
        )
    
    return {
        'tokens_sent': len(all_tokens),
        'notifications_created': notifications_created
    }

# Test endpoint for notifications
class TestNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Send a test notification"""
        user = request.user
        
        # Get user's active device tokens
        device_tokens = DeviceToken.objects.filter(
            user=user,
            is_active=True
        ).values_list('token', flat=True)
        
        if not device_tokens:
            return Response({
                'success': False,
                'message': 'No active devices found. Please ensure notifications are enabled.'
            })
        
        # Send test notification
        result = send_push_notification(
            list(device_tokens),
            '✅ Test Notification',
            'This is a test notification from Imanage AI. If you receive this, notifications are working!',
            {'type': 'test', 'timestamp': timezone.now().isoformat()},
            'system'
        )
        
        # Store test notification
        Notification.objects.create(
            user=user,
            title='Test Notification',
            message='This is a test notification from Imanage AI.',
            notification_type='system',
            data={'test': True}
        )
        
        return Response({
            'success': True,
            'message': f'Test notification sent to {len(device_tokens)} device(s)',
            'result': result
        })