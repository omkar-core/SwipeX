/**
 * SwipeX Web Push Notification Service
 * Behind VITE_ENABLE_PUSH=true flag
 */

export interface PushStatus {
  isSupported: boolean;
  isEnabledInEnv: boolean;
  hasCredentials: boolean;
  permission: NotificationPermission;
}

class PushNotificationService {
  /**
   * Check if browser supports Web Push and Service Workers
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Check if push is enabled via environment variable
   */
  public isEnabledInEnv(): boolean {
    return import.meta.env.VITE_ENABLE_PUSH === 'true';
  }

  /**
   * Check if Firebase / VAPID credentials are configured in environment
   */
  public hasCredentials(): boolean {
    return Boolean(
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_VAPID_KEY
    );
  }

  /**
   * Get current push notification status
   */
  public getStatus(): PushStatus {
    const supported = this.isSupported();
    return {
      isSupported: supported,
      isEnabledInEnv: this.isEnabledInEnv(),
      hasCredentials: this.hasCredentials(),
      permission: supported ? Notification.permission : 'denied',
    };
  }

  /**
   * Request browser notification permission
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }
    return await Notification.requestPermission();
  }

  /**
   * Register service worker and subscribe to push service
   */
  public async register(): Promise<string | null> {
    if (!this.isSupported() || !this.isEnabledInEnv()) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        console.info(
          '[PushService] Service worker registered. Running in degraded in-app mode because VITE_FIREBASE_VAPID_KEY is not set.'
        );
        return 'mock-subscription-token';
      }

      // If VAPID key is provided, subscribe with pushManager
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
      }

      return JSON.stringify(subscription);
    } catch (err) {
      console.warn('[PushService] Web Push registration failed, degrading gracefully to in-app:', err);
      return null;
    }
  }
}

export const pushService = new PushNotificationService();
