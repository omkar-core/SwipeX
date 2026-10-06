import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { NotificationProvider } from '../context/NotificationContext';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { NotificationService } from '../services/notificationService';

describe('NotificationBell Component & Dropdown Interaction', () => {
  beforeEach(() => {
    localStorage.clear();
    NotificationService.resetMockStore();
  });

  const renderWithProviders = (onNavigateTab = vi.fn()) => {
    return render(
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <NotificationBell onNavigateTab={onNavigateTab} />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    );
  };

  it('renders the bell trigger button with accessible label', async () => {
    renderWithProviders();

    const bellBtn = await screen.findByRole('button', { name: /Notifications/i });
    expect(bellBtn).toBeInTheDocument();
  });

  it('displays the unread badge count when unread notifications exist', async () => {
    renderWithProviders();

    await waitFor(() => {
      const badge = screen.getByText(/\d+/);
      expect(badge).toBeInTheDocument();
    });
  });

  it('opens flyout dropdown on click and displays latest notifications with visual categories', async () => {
    renderWithProviders();

    const bellBtn = await screen.findByRole('button', { name: /Notifications/i });
    fireEvent.click(bellBtn);

    expect(screen.getByRole('region', { name: /Notification dropdown/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Notifications$/i })).toBeInTheDocument();

    // Check category badges are rendered
    expect(screen.getByText('High Match')).toBeInTheDocument();
    expect(screen.getByText('Low Competition')).toBeInTheDocument();
  });

  it('marks notification as read and navigates when clicking a notification item', async () => {
    const navigateSpy = vi.fn();
    renderWithProviders(navigateSpy);

    const bellBtn = await screen.findByRole('button', { name: /Notifications/i });
    fireEvent.click(bellBtn);

    const firstItem = await screen.findByText(/High AI Match: Senior Frontend Engineer at Stripe/i);
    fireEvent.click(firstItem);

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalled();
    });
  });

  it('closes dropdown when pressing the Escape key', async () => {
    renderWithProviders();

    const bellBtn = await screen.findByRole('button', { name: /Notifications/i });
    fireEvent.click(bellBtn);

    expect(screen.getByRole('region', { name: /Notification dropdown/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /Notification dropdown/i })).not.toBeInTheDocument();
    });
  });
});
