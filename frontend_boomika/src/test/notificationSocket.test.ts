import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationSocketClient } from '../services/notificationSocket';
import { Notification } from '../types';

describe('NotificationSocketClient & Real-Time Engine', () => {
  let client: NotificationSocketClient;

  beforeEach(() => {
    localStorage.clear();
    client = new NotificationSocketClient();
  });

  afterEach(() => {
    client.close();
  });

  it('notifies status listeners when entering mock mode', () => {
    const statusSpy = vi.fn();
    const unsub = client.onStatusChange(statusSpy);

    client.connect();

    expect(statusSpy).toHaveBeenCalledWith('mock', true);
    unsub();
  });

  it('delivers manually emitted notifications to all subscribers', () => {
    const notificationSpy = vi.fn();
    const unsub = client.onNotification(notificationSpy);

    client.connect();

    const mockAlert: Partial<Notification> = {
      type: 'high_match',
      title: 'Real-Time Alert Test',
      message: 'Testing socket subscriber pipeline',
      match_percentage: 95,
    };

    const emitted = client.emitMockNotification(mockAlert);

    expect(notificationSpy).toHaveBeenCalledTimes(1);
    expect(notificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Real-Time Alert Test',
        match_percentage: 95,
        type: 'high_match',
      })
    );
    expect(emitted.id).toBeDefined();

    unsub();
  });

  it('unsubscribes listeners cleanly', () => {
    const notificationSpy = vi.fn();
    const unsub = client.onNotification(notificationSpy);

    unsub();

    client.emitMockNotification({
      type: 'instant_job',
      title: 'Should not receive',
    });

    expect(notificationSpy).not.toHaveBeenCalled();
  });

  it('cleanly closes connections and timers on close()', () => {
    const statusSpy = vi.fn();
    client.onStatusChange(statusSpy);

    client.connect();
    expect(client.getStatus().isConnected).toBe(true);

    client.close();
    expect(client.getStatus().isConnected).toBe(false);
  });
});
