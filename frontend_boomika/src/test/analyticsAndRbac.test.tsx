import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { RecommendationInsightsPanel } from '../components/analytics/RecommendationInsightsPanel';
import { SwipeBehaviorSummary } from '../components/analytics/SwipeBehaviorSummary';
import { AdminAnalyticsScreen } from '../components/admin/AdminAnalyticsScreen';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { API_CONFIG } from '../config/api';
import { User } from '../types';

describe('Analytics & RBAC Components', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders RecommendationInsightsPanel with AI explainability cards', async () => {
    render(<RecommendationInsightsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/AI Recommendation Rationale/i)).toBeDefined();
      expect(screen.getByText('Stripe')).toBeDefined();
      expect(screen.getByText('Senior Frontend Engineer')).toBeDefined();
      expect(screen.getByText(/High skill overlap in React, TypeScript/i)).toBeDefined();
    });
  });

  it('renders SwipeBehaviorSummary with ratio and domain focus', async () => {
    render(<SwipeBehaviorSummary />);

    await waitFor(() => {
      expect(screen.getByText(/Swipe Discovery Dynamics/i)).toBeDefined();
      expect(screen.getByText(/Developer Tools & SaaS/i)).toBeDefined();
      expect(screen.getByText(/Liked \/ Applied/i)).toBeDefined();
    });
  });

  it('blocks non-admin users from AdminAnalyticsScreen', async () => {
    const candidateUser: User = {
      user_id: 'usr_cand_1',
      name: 'Candidate User',
      email: 'cand@test.com',
      role: 'candidate',
    };
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, 'token_cand');
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(candidateUser));

    render(
      <AuthProvider>
        <ToastProvider>
          <AdminAnalyticsScreen />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-restricted')).toBeDefined();
      expect(screen.getByText(/Access Restricted/i)).toBeDefined();
    });
  });

  it('grants admin users full telemetry in AdminAnalyticsScreen', async () => {
    const adminUser: User = {
      user_id: 'usr_admin_1',
      name: 'Admin User',
      email: 'admin@swipex.io',
      role: 'admin',
    };
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, 'token_admin');
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(adminUser));

    render(
      <AuthProvider>
        <ToastProvider>
          <AdminAnalyticsScreen />
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-analytics-screen')).toBeDefined();
      expect(screen.getByText(/Platform Administration & System Health/i)).toBeDefined();
      expect(screen.getByText(/Total Users/i)).toBeDefined();
      expect(screen.getByText(/Active Jobs/i)).toBeDefined();
    });
  });
});
