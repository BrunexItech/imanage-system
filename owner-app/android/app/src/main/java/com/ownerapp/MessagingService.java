package com.ownerapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.facebook.react.HeadlessJsTaskService;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MessagingService extends FirebaseMessagingService {
    private static final String TAG = "MessagingService";
    private static final String CHANNEL_ID = "imanage_alerts";
    private static final String CHANNEL_NAME = "Imanage AI Alerts";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token: " + token);
        // Send token to your backend if needed
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "Message received: " + remoteMessage.getData());
        
        Map<String, String> data = remoteMessage.getData();
        String title = data.get("title");
        String message = data.get("message");
        String type = data.get("type"); // sale, stock, alert, summary
        
        if (title == null && remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
        }
        
        if (message == null && remoteMessage.getNotification() != null) {
            message = remoteMessage.getNotification().getBody();
        }
        
        if (title != null && message != null) {
            showNotification(title, message, type);
        }
        
        // Check if app is in background
        if (isAppInBackground()) {
            // Start headless task for background processing
            HeadlessJsTaskService.acquireWakeLockNow(this.getApplicationContext());
        }
    }

    private void showNotification(String title, String message, String type) {
        NotificationManager notificationManager = 
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        // Create notification channel for Android O and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Business alerts and notifications");
            notificationManager.createNotificationChannel(channel);
        }
        
        // Set notification sound
        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        
        // Build notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setSound(soundUri);
        
        // Set importance based on notification type
        if ("alert".equals(type) || "stock".equals(type)) {
            builder.setPriority(NotificationCompat.PRIORITY_MAX);
        }
        
        // Show notification
        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, builder.build());
    }

    private boolean isAppInBackground() {
        // Simplified check - in production use proper background detection
        return true;
    }
}