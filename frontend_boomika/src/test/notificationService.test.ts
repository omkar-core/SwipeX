import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '../services/notificationService';
import { API_CONFIG } from '../config/api';
import { AlertPreferences, Notification } from '../types';

describe('NotificationService & Local Mock Store Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    NotificationService.resetMockStore();
  });

  it('seeds default notifications covering all 4 alert types, application status, and system alerts', async () => {
    const { items, unread_count } = await NotificationService.list();

    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(unread_count).toBeGreaterThanOrEqual(1);

    const types = items.map((i) => i.type);
    expect(types).toContain('high_match');
    expect(types).toContain('low_competition');
    expect(types).toContain('application_status');
    expect(types).toContain('startup_hiring');
    expect(types).toContain('instant_job');
    expect(types).toContain('system');
  });

  it('filters notifications by category', async () => {
    const highMatchOnly = await NotificationService.list({ type: 'high_match' });
    expect(highMatchOnly.items.every((i) => i.type === 'high_match')).toBe(true);

    const lowCompOnly = await NotificationService.list({ type: 'low_competition' });
    expect(lowCompOnly.items.every((i) => i.type === 'low_competition')).toBe(true);
  });

  it('filters unread notifications and calculates unread count accurately', async () => {
    const unreadOnly = await NotificationService.list({ unread_only: true });
    expect(unreadOnly.items.every((i) => !i.read)).toBe(true);

    const countRes = await NotificationService.unreadCount();
    expect(countRes.unread_count).toBe(unreadOnly.items.length);
  });

  it('marks a single notification as read', async () => {
    const { items } = await NotificationService.list();
    const unreadItem = items.find((i) => !i.read);
    expect(unreadItem).toBeDefined();

    const markRes = await NotificationService.markRead(unreadItem!.id);
    expect(markRes.success).toBe(true);
    expect(markRes.id).toBe(unreadItem!.id);

    const updatedList = await NotificationService.list();
    const updated = updatedList.items.find((i) => i.id === unreadItem!.id);
    expect(updated?.read).toBe(true);
  });

  it('marks all notifications as read in bulk', async () => {
    const markAllRes = await NotificationService.markAllRead();
    expect(markAllRes.success).toBe(true);

    const { unread_count } = await NotificationService.unreadCount();
    expect(unread_count).toBe(0);

    const updatedList = await NotificationService.list();
    expect(updatedList.items.every((i) => i.read)).toBe(true);
  });

  it('reads and updates alert preferences in localStorage store', async () => {
    const defaultPrefs = await NotificationService.getPreferences();
    expect(defaultPrefs.match_threshold).toBe(80);
    expect(defaultPrefs.quiet_hours.enabled).toBe(true);

    const updatedPrefs: AlertPreferences = {
      ...defaultPrefs,
      match_threshold: 88,
      quiet_hours: {
        enabled: true,
        start: '23:00',
        end: '07:00',
      },
    };

    const saved = await NotificationService.savePreferences(updatedPrefs);
    expect(saved.match_threshold).toBe(88);
    expect(saved.quiet_hours.start).toBe('23:00');

    const retrieved = await NotificationService.getPreferences();
    expect(retrieved.match_threshold).toBe(88);
    expect(retrieved.quiet_hours.start).toBe('23:00');
  });

  it('adds a new notification and prepends it to the store', async () => {
    const added = NotificationService.addNotification({
      type: 'high_match',
      title: 'New Dynamic Alert',
      message: 'Dynamic test notification',
      match_percentage: 96,
    });

    expect(added.id).toBeDefined();
    expect(added.read).toBe(false);

    const { items } = await NotificationService.list();
    expect(items[0].title).toBe('New Dynamic Alert');
  });
});
