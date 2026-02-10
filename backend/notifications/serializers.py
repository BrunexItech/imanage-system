from rest_framework import serializers
from .models import DeviceToken, Notification

class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['id', 'token', 'device_type', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'data', 
                 'is_read', 'sent_at', 'read_at']
        read_only_fields = ['id', 'sent_at', 'read_at']