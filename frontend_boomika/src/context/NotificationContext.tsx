import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { Notification, AlertPreferences, NotificationType } from '../types';
import { API_CONFIG } from '../config/api';
import { NotificationService } from '../services/notificationService';
import { notificationSocket, SocketConnectionMode } from '../services/notificationSocket';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  isConnected: boolean;
  connectionMode: SocketConnectionMode;
  preferences: AlertPreferences | null;
  updatePreferences: (prefs: AlertPreferences) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Pure helper to check if current time falls within quiet hours (e.g., 22:00 -> 08:00).
 */
export function isCurrentlyQuietHours(
  startStr: string,
  endStr: string,
  now: Date = new Date()
): boolean {
  if (!startStr || !endStr || startStr === endStr) return false;

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes < endMinutes) {
    // Normal window: e.g. 01:00 to 06:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window: e.g. 22:00 to 08:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionMode, setConnectionMode] = useState<SocketConnectionMode>('mock');

  const preferencesRef = useRef<AlertPreferences | null>(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Initial load of notifications & preferences
  const fetchInitialData = useCallback(async () => {
    if (!isAuthenticated && !API_CONFIG.USE_MOCK) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [notifData, prefsData] = await Promise.all([
        NotificationService.list({ limit: 30 }),
        NotificationService.getPreferences(),
      ]);

      setNotifications(notifData.items);
      setUnreadCount(notifData.unread_count);
      setPreferences(prefsData);
    } catch {
      // Failed silently
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData, isAuthenticated]);

  // Handle incoming real-time alert
  const handleIncomingNotification = useCallback(
    (newNotif: Notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });

      if (!newNotif.read) {
        setUnreadCount((prev) => prev + 1);
      }

      // Check client-side preferences filter
      const currentPrefs = preferencesRef.current;
      if (currentPrefs) {
        // 1. Is this alert category enabled?
        const isTypeEnabled = currentPrefs.types[newNotif.type] !== false;
        if (!isTypeEnabled) return;

        // 2. High match threshold filter
        if (
          newNotif.type === 'high_match' &&
          typeof newNotif.match_percentage === 'number' &&
          newNotif.match_percentage < currentPrefs.match_threshold
        ) {
          return;
        }

        // 3. Quiet hours check
        if (
          currentPrefs.quiet_hours.enabled &&
          isCurrentlyQuietHours(
            currentPrefs.quiet_hours.start,
            currentPrefs.quiet_hours.end
          )
        ) {
          return;
        }
      }

      // Trigger user-facing in-app toast
      const toastType =
        newNotif.type === 'high_match'
          ? 'success'
          : newNotif.type === 'low_competition'
          ? 'warning'
          : 'info';

      showToast(`🔔 ${newNotif.title}`, toastType);
    },
    [showToast]
  );

  // Manage WebSocket connection lifecycle
  useEffect(() => {
    if (!isAuthenticated && !API_CONFIG.USE_MOCK) {
      notificationSocket.close();
      return;
    }

    const unsubStatus = notificationSocket.onStatusChange((mode, connected) => {
      setConnectionMode(mode);
      setIsConnected(connected);
    });

    const unsubNotification = notificationSocket.onNotification((notif) => {
      handleIncomingNotification(notif);
    });

    notificationSocket.connect();

    return () => {
      unsubStatus();
      unsubNotification();
      notificationSocket.close();
    };
  }, [isAuthenticated, handleIncomingNotification]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await NotificationService.markRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    await NotificationService.markAllRead();
  }, []);

  const updatePreferences = useCallback(async (newPrefs: AlertPreferences) => {
    setPreferences(newPrefs);
    const saved = await NotificationService.savePreferences(newPrefs);
    setPreferences(saved);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        isConnected,
        connectionMode,
        preferences,
        updatePreferences,
        refreshNotifications: fetchInitialData,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
