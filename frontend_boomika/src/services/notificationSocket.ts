/**
 * SwipeX Real-Time Notification Socket & Resilient Fallback Engine
 * 
 * Features:
 * 1. WebSocket Client with JWT query authentication.
 * 2. Exponential-backoff reconnection strategy (max 30s).
 * 3. Keep-alive heartbeat ping/pong.
 * 4. Automatic Polling Fallback when WebSocket server is unavailable.
 * 5. Mock Mode Live Event Emitter for interactive demonstrations.
 */

import { API_CONFIG } from '../config/api';
import { Notification, NotificationType } from '../types';
import { ApiAdapter } from './apiAdapter';
import { NotificationService } from './notificationService';

export type SocketConnectionMode = 'websocket' | 'polling' | 'mock';
export type NotificationCallback = (notification: Notification) => void;
export type StatusCallback = (mode: SocketConnectionMode, isConnected: boolean) => void;

const MOCK_ALERT_TEMPLATES: Array<{
  type: NotificationType;
  title: string;
  message: string;
  match_percentage: number;
  company: string;
}> = [
  {
    type: 'high_match',
    title: 'High AI Match: Staff Frontend Engineer at Airbnb',
    message: 'Your profile matches 95% of required skills (React, Design Systems, Web Vitals).',
    match_percentage: 95,
    company: 'Airbnb',
  },
  {
    type: 'low_competition',
    title: 'Low Competition Alert: Founding UI Engineer at Resend',
    message: 'Only 3 candidates have applied in the last 12 hours. Fast-track screening active.',
    match_percentage: 89,
    company: 'Resend',
  },
  {
    type: 'startup_hiring',
    title: 'Startup Hiring Surge: Vercel is expanding Developer Experience',
    message: 'High-growth startup Vercel just published 2 new remote frontend openings.',
    match_percentage: 91,
    company: 'Vercel',
  },
  {
    type: 'instant_job',
    title: 'Instant Job Match: Senior UI Architect at GitHub',
    message: 'New role matching your preferences: $170k - $210k, Remote (US/Global).',
    match_percentage: 88,
    company: 'GitHub',
  },
];

export class NotificationSocketClient {
  private ws: WebSocket | null = null;
  private isExplicitlyClosed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private pollingTimer: any = null;
  private mockEmitterTimer: any = null;

  private mode: SocketConnectionMode = 'mock';
  private isConnected = false;

  private notificationListeners: Set<NotificationCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();

  /**
   * Subscribes to incoming real-time notifications.
   */
  public onNotification(listener: NotificationCallback): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  /**
   * Subscribes to connection state and mode changes.
   */
  public onStatusChange(listener: StatusCallback): () => void {
    this.statusListeners.add(listener);
    listener(this.mode, this.isConnected);
    return () => this.statusListeners.delete(listener);
  }

  private notifyListeners(notification: Notification): void {
    this.notificationListeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (err) {
        console.error('[NotificationSocket] Error in listener callback:', err);
      }
    });
  }

  private updateStatus(mode: SocketConnectionMode, isConnected: boolean): void {
    this.mode = mode;
    this.isConnected = isConnected;
    this.statusListeners.forEach((listener) => {
      try {
        listener(mode, isConnected);
      } catch (err) {
        console.error('[NotificationSocket] Error in status callback:', err);
      }
    });
  }

  /**
   * Connects to WebSocket or initiates mock/polling fallback based on configuration.
   */
  public connect(): void {
    this.isExplicitlyClosed = false;

    if (API_CONFIG.USE_MOCK) {
      this.startMockEmitter();
      return;
    }

    this.initiateWebSocket();
  }

  /**
   * Establishes real WebSocket connection with JWT token handshake.
   */
  private initiateWebSocket(): void {
    if (this.isExplicitlyClosed) return;

    try {
      const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
      if (!token && !API_CONFIG.USE_MOCK) {
        return;
      }
      
      // Determine protocol: ensure wss:// in production or if current origin is https://
      let wsUrl = API_CONFIG.WS_URL;
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && wsUrl.startsWith('ws:')) {
        wsUrl = wsUrl.replace(/^ws:/, 'wss:');
      }

      const wsUrlWithToken = token
        ? `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
        : wsUrl;

      this.ws = new WebSocket(wsUrlWithToken);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus('websocket', true);

        // Send token handshake message as well (supports backends expecting message auth)
        if (token && this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(JSON.stringify({ type: 'auth', token }));
          } catch {
            // Ignore write error
          }
        }

        this.startHeartbeat();
        this.stopPolling();
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.type === 'ping' || raw.type === 'pong') return;
          const notification = ApiAdapter.toNotification(raw);
          this.notifyListeners(notification);
        } catch {
          // Ignore invalid non-JSON frames
        }
      };

      this.ws.onerror = () => {
        // Handled in onclose
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.updateStatus('polling', false);

        if (!this.isExplicitlyClosed) {
          this.startPolling();
          this.scheduleReconnect();
        }
      };
    } catch {
      this.updateStatus('polling', false);
      this.startPolling();
      this.scheduleReconnect();
    }
  }

  /**
   * Exponential backoff reconnection scheduler (max 30s).
   */
  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectAttempts++;
    const backoffMs = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));

    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed && this.mode !== 'mock') {
        this.initiateWebSocket();
      }
    }, backoffMs);
  }

  /**
   * WebSocket keep-alive ping.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch {
          // Socket write failed
        }
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Polling fallback (runs every 30 seconds when WebSocket is down).
   */
  private startPolling(): void {
    if (this.pollingTimer) return;

    this.pollingTimer = setInterval(async () => {
      try {
        const { items } = await NotificationService.list({ limit: 5 });
        // Find newest unread if any
        if (items.length > 0 && !items[0].read) {
          this.notifyListeners(items[0]);
        }
      } catch {
        // Polling failed silently
      }
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Mock Mode Live Emitter: Emits simulated alerts every 25-40 seconds for realistic UX testing.
   */
  private startMockEmitter(): void {
    this.stopMockEmitter();
    this.updateStatus('mock', true);

    const scheduleNextMockAlert = () => {
      if (this.isExplicitlyClosed) return;
      const intervalMs = Math.floor(Math.random() * 15000) + 25000; // 25s - 40s

      this.mockEmitterTimer = setTimeout(() => {
        if (this.isExplicitlyClosed) return;

        const template =
          MOCK_ALERT_TEMPLATES[
            Math.floor(Math.random() * MOCK_ALERT_TEMPLATES.length)
          ];

        const created = NotificationService.addNotification({
          type: template.type,
          title: template.title,
          message: template.message,
          match_percentage: template.match_percentage,
          channel: 'in_app',
        });

        this.notifyListeners(created);
        scheduleNextMockAlert();
      }, intervalMs);
    };

    scheduleNextMockAlert();
  }

  private stopMockEmitter(): void {
    if (this.mockEmitterTimer) {
      clearTimeout(this.mockEmitterTimer);
      this.mockEmitterTimer = null;
    }
  }

  /**
   * Manually emit a notification in mock mode (e.g. for testing or cross-component triggers).
   */
  public emitMockNotification(notification: Partial<Notification>): Notification {
    const created = NotificationService.addNotification(notification);
    this.notifyListeners(created);
    return created;
  }

  /**
   * Cleanly closes all socket connections, timers, and listeners.
   */
  public close(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    this.stopPolling();
    this.stopMockEmitter();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }

    this.updateStatus(this.mode, false);
  }

  public getStatus(): { mode: SocketConnectionMode; isConnected: boolean } {
    return { mode: this.mode, isConnected: this.isConnected };
  }
}

// Export singleton instance for app-wide lifecycle
export const notificationSocket = new NotificationSocketClient();
