import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { ownerAPI } from './api';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.notificationListeners = [];
  }

  // Initialize notification service
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Request permission
      const hasPermission = await this.requestPermission();
      
      if (!hasPermission) {
        console.log('Notification permission denied');
        return false;
      }

      // Get FCM token
      const token = await this.getFCMToken();
      if (token) {
        console.log('FCM Token:', token);
        // Send token to your backend (silently fail if endpoint not ready)
        await this.registerToken(token);
      }

      // Setup notification listeners
      this.setupListeners();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        return enabled;
      } else if (Platform.OS === 'android') {
        // Android 13+ requires permission
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true; // Android < 13 doesn't need runtime permission
      }
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  // Get FCM token
  async getFCMToken() {
    try {
      // Check if token already exists
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  // Register token with backend (with graceful error handling)
  async registerToken(token) {
    try {
      // Send token to your Django backend
      await ownerAPI.registerDeviceToken(token);
      console.log('Device token registered successfully');
    } catch (error) {
      // Handle 404 specifically (endpoint not yet implemented)
      if (error.response?.status === 404) {
        console.log('Notification endpoint not yet implemented. Continuing without token registration.');
        return; // Don't throw error, just log and continue
      }
      
      // Handle other errors
      if (error.response?.status === 401) {
        console.log('Unauthorized - user not logged in');
      } else if (error.message?.includes('Network Error')) {
        console.log('Network error - backend may be unreachable');
      } else {
        console.error('Failed to register token:', error.message);
      }
    }
  }

  // Setup notification listeners
  setupListeners() {
    // Handle notifications when app is in foreground
    this.foregroundListener = messaging().onMessage(async remoteMessage => {
      console.log('Foreground notification:', remoteMessage);
      
      const { notification, data } = remoteMessage;
      
      // Show alert (you can replace with your own UI)
      if (notification) {
        Alert.alert(
          notification.title || 'Imanage AI',
          notification.body || 'New notification',
          [
            { text: 'OK', onPress: () => {} },
            { text: 'View', onPress: () => this.handleNotificationTap(data) }
          ]
        );
      }

      // Notify all listeners
      this.notifyListeners(remoteMessage);
    });

    // Handle notification tap when app is in background/quit
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationTap(remoteMessage.data);
    });

    // Check if app was opened by notification tap
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened by notification:', remoteMessage);
          this.handleNotificationTap(remoteMessage.data);
        }
      });
  }

  // Handle notification tap action
  handleNotificationTap(data) {
    if (!data) return;

    const { type, sale_id, product_id, summary_id } = data;
    
    // Navigate based on notification type
    // You'll need to implement navigation based on your app structure
    console.log('Notification tapped:', data);
    
    // Example: Notify listeners about the tap
    this.notifyListeners({ ...data, tapped: true });
  }

  // Subscribe to notifications
  subscribe(callback) {
    this.notificationListeners.push(callback);
    return () => {
      const index = this.notificationListeners.indexOf(callback);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  notifyListeners(notification) {
    this.notificationListeners.forEach(callback => {
      if (typeof callback === 'function') {
        callback(notification);
      }
    });
  }

  // Test function to send a local notification
  async sendTestNotification() {
    try {
      const response = await ownerAPI.sendNotification({
        title: 'Test Notification',
        message: 'This is a test notification from Imanage AI',
        type: 'system'
      });
      console.log('Test notification sent:', response.data);
      return true;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  // Cleanup
  destroy() {
    if (this.foregroundListener) {
      this.foregroundListener();
    }
    this.notificationListeners = [];
    this.isInitialized = false;
  }
}

// Singleton instance
export default new NotificationService();