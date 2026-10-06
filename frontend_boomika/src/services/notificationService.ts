/**
 * SwipeX Notification Service Layer
 * 
 * Implements Resilient Dual-Mode Architecture:
 * - VITE_USE_MOCK=true: Fully local localStorage-backed persistent mock notification engine.
 * - VITE_USE_MOCK=false: Real REST endpoints with graceful client-side fallback on 404/500/network error.
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { Notification, AlertPreferences, NotificationType } from '../types';
import { ApiAdapter } from './apiAdapter';

const MOCK_SEEDED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_seed_1',
    type: 'high_match',
    title: 'High AI Match: Senior Frontend Engineer at Stripe',
    message: 'Your active resume scored 94% ATS compatibility for React, TypeScript, and Next.js requirements.',
    job_id: 1,
    match_percentage: 94,
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12m ago
    read: false,
    channel: 'in_app',
  },
  {
    id: 'notif_seed_2',
    type: 'low_competition',
    title: 'Low Competition Alert: Frontend Architect at Linear',
    message: 'Only 4 applicants have applied in the first 24 hours. Early applicants receive 3x callback rates.',
    job_id: 2,
    match_percentage: 89,
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(), // 1h ago
    read: false,
    channel: 'in_app',
  },
  {
    id: 'notif_seed_3',
    type: 'application_status',
    title: 'Status Update: Application moved to Interviewing at Vercel',
    message: 'Sarah Lin (Lead Recruiter) invited you for a 45-minute technical architecture screening.',
    application_id: 'app_seed_vercel',
    job_id: 3,
    match_percentage: 92,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3h ago
    read: false,
    channel: 'in_app',
  },
  {
    id: 'notif_seed_4',
    type: 'startup_hiring',
    title: 'Startup Hiring Surge: Supabase is scaling UI Engineering',
    message: 'High-growth startup Supabase just posted 3 remote frontend roles matching your skill set.',
    job_id: 4,
    match_percentage: 88,
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), // 14h ago
    read: true,
    channel: 'in_app',
  },
  {
    id: 'notif_seed_5',
    type: 'instant_job',
    title: 'Instant Job Match: Staff UI Engineer at Figma',
    message: 'New posting aligned with your Target Track: Design Systems & Performance Optimization.',
    job_id: 5,
    match_percentage: 86,
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), // 1d ago
    read: true,
    channel: 'in_app',
  },
  {
    id: 'notif_seed_6',
    type: 'system',
    title: 'ATS Optimization Complete: Resume v3 Benchmarked',
    message: 'Resume v3 scored 88% overall fit score. Top recommended action: Add "GraphQL" to reach 95%.',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 2d ago
    read: true,
    channel: 'in_app',
  },
  {
    id: 'notif_seed_7',
    type: 'high_match',
    title: 'High AI Match: Senior Frontend Platform at Datadog',
    message: '91% ATS match score based on your frontend state management and TypeScript proficiency.',
    job_id: 6,
    match_percentage: 91,
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), // 3d ago
    read: true,
    channel: 'in_app',
  },
];

const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  types: {
    instant_job: true,
    startup_hiring: true,
    high_match: true,
    low_competition: true,
    application_status: true,
    system: true,
  },
  channels: {
    in_app: true,
    email: true,
    push: false,
  },
  match_threshold: 80,
  quiet_hours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
  },
};

export class NotificationService {
  /**
   * Reads raw notifications from localStorage mock store, initializing if empty.
   */
  private static getMockStore(): Notification[] {
    try {
      const stored = localStorage.getItem(API_CONFIG.STORAGE_KEYS.NOTIFICATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fall through to reseed on parsing error
    }

    // Seed defaults
    try {
      localStorage.setItem(
        API_CONFIG.STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify(MOCK_SEEDED_NOTIFICATIONS)
      );
    } catch {
      // Storage unavailable or disabled
    }
    return [...MOCK_SEEDED_NOTIFICATIONS];
  }

  /**
   * Persists list of notifications to localStorage.
   */
  private static saveMockStore(items: Notification[]): void {
    try {
      localStorage.setItem(
        API_CONFIG.STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify(items)
      );
    } catch {
      // Ignore quota/storage errors
    }
  }

  /**
   * Fetches list of notifications with pagination & filtering.
   */
  static async list(params?: {
    limit?: number;
    cursor?: string;
    unread_only?: boolean;
    type?: NotificationType | 'all';
  }): Promise<{ items: Notification[]; next_cursor?: string; unread_count: number }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.cursor) query.set('cursor', params.cursor);
        if (params?.unread_only) query.set('unread_only', 'true');
        if (params?.type && params.type !== 'all') query.set('type', params.type);

        const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.LIST}?${query.toString()}`;
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const json = await res.json();
          return ApiAdapter.toNotificationList(json);
        }
        console.warn(`[NotificationService] Backend returned HTTP ${res.status}. Falling back to mock store.`);
      } catch (err) {
        console.warn('[NotificationService] Network error during list fetch. Falling back to mock store:', err);
      }
    }

    // Mock / Fallback execution
    let items = this.getMockStore();

    if (params?.unread_only) {
      items = items.filter((i) => !i.read);
    }

    if (params?.type && params.type !== 'all') {
      items = items.filter((i) => i.type === params.type);
    }

    // Sort newest first
    items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const limit = params?.limit || 20;
    const paginated = items.slice(0, limit);
    const unreadCount = this.getMockStore().filter((i) => !i.read).length;

    return {
      items: paginated,
      next_cursor: items.length > limit ? String(limit) : undefined,
      unread_count: unreadCount,
    };
  }

  /**
   * Retrieves the unread notification count.
   */
  static async unreadCount(): Promise<{ unread_count: number }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT}`;
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const json = await res.json();
          const unread = ApiAdapter.toUnreadCount(json);
          return { unread_count: unread };
        }
      } catch {
        // Fallback silently
      }
    }

    const items = this.getMockStore();
    return { unread_count: items.filter((i) => !i.read).length };
  }

  /**
   * Marks a single notification as read.
   */
  static async markRead(id: string): Promise<{ success: boolean; id: string }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)}`;
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          // Keep local mock in sync
          const items = this.getMockStore().map((item) =>
            item.id === id ? { ...item, read: true } : item
          );
          this.saveMockStore(items);
          return { success: true, id };
        }
      } catch {
        // Fallback silently
      }
    }

    const items = this.getMockStore().map((item) =>
      item.id === id ? { ...item, read: true } : item
    );
    this.saveMockStore(items);
    return { success: true, id };
  }

  /**
   * Marks all notifications as read.
   */
  static async markAllRead(): Promise<{ success: boolean; count: number }> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.READ_ALL}`;
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const items = this.getMockStore().map((item) => ({ ...item, read: true }));
          this.saveMockStore(items);
          return { success: true, count: items.length };
        }
      } catch {
        // Fallback silently
      }
    }

    const items = this.getMockStore().map((item) => ({ ...item, read: true }));
    this.saveMockStore(items);
    return { success: true, count: items.length };
  }

  /**
   * Retrieves user alert preferences.
   */
  static async getPreferences(): Promise<AlertPreferences> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.PREFERENCES}`;
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const json = await res.json();
          return ApiAdapter.toAlertPreferences(json.data ?? json);
        }
      } catch {
        // Fallback silently
      }
    }

    try {
      const stored = localStorage.getItem(API_CONFIG.STORAGE_KEYS.ALERT_PREFERENCES);
      if (stored) {
        return ApiAdapter.toAlertPreferences(JSON.parse(stored));
      }
    } catch {
      // Return defaults
    }

    return { ...DEFAULT_ALERT_PREFERENCES };
  }

  /**
   * Saves user alert preferences.
   */
  static async savePreferences(prefs: AlertPreferences): Promise<AlertPreferences> {
    const normalized = ApiAdapter.toAlertPreferences(prefs);

    if (!API_CONFIG.USE_MOCK) {
      try {
        const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.PREFERENCES}`;
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(normalized),
        });

        if (res.ok) {
          const json = await res.json();
          const updated = ApiAdapter.toAlertPreferences(json.data ?? json);
          localStorage.setItem(
            API_CONFIG.STORAGE_KEYS.ALERT_PREFERENCES,
            JSON.stringify(updated)
          );
          return updated;
        }
      } catch {
        // Fallback silently
      }
    }

    try {
      localStorage.setItem(
        API_CONFIG.STORAGE_KEYS.ALERT_PREFERENCES,
        JSON.stringify(normalized)
      );
    } catch {
      // Storage error
    }

    return normalized;
  }

  /**
   * Adds a notification to the local store (used for mock emitter & recruiter pipeline triggers).
   */
  static addNotification(notif: Partial<Notification>): Notification {
    const newNotif: Notification = {
      id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: notif.type || 'instant_job',
      title: notif.title || 'Career Opportunity Alert',
      message: notif.message || 'A new position matching your preferences was discovered.',
      job_id: notif.job_id,
      application_id: notif.application_id,
      match_percentage: notif.match_percentage,
      created_at: notif.created_at || new Date().toISOString(),
      read: false,
      channel: notif.channel || 'in_app',
      priority: notif.priority || 'medium',
    };

    const current = this.getMockStore();
    const updated = [newNotif, ...current];
    this.saveMockStore(updated);
    return newNotif;
  }

  /**
   * Convenience getter for all notifications
   */
  static async getNotifications(): Promise<Notification[]> {
    const res = await this.list();
    return res.items;
  }

  /**
   * Alias for addNotification
   */
  static async createNotification(notif: Partial<Notification>): Promise<Notification> {
    return this.addNotification(notif);
  }

  /**
   * Resets local notification mock store back to default seed.
   */
  static resetMockStore(): void {
    try {
      localStorage.setItem(
        API_CONFIG.STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify(MOCK_SEEDED_NOTIFICATIONS)
      );
    } catch {
      // Ignore
    }
  }

  /**
   * Alias for resetMockStore
   */
  static resetStorage(): void {
    this.resetMockStore();
  }
}

export const notificationService = NotificationService;

