import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HiringTrendsScreen } from '../components/analytics/HiringTrendsScreen';
import { ToastProvider } from '../context/ToastContext';
import { ApiService } from '../services/api';

describe('HiringTrendsScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithContext = (props = {}) => {
    return render(
      <ToastProvider>
        <HiringTrendsScreen {...props} />
      </ToastProvider>
    );
  };

  it('renders loading state initially and then shows KPI cards and SVG charts', async () => {
    renderWithContext();

    // Should render KPI labels after load
    await waitFor(() => {
      expect(screen.getByText(/Active Openings/i)).toBeInTheDocument();
      expect(screen.getByText(/In-Demand Skill/i)).toBeInTheDocument();
      expect(screen.getByText(/Startup Hiring Share/i)).toBeInTheDocument();
    });

    // Should render SVG charts
    expect(screen.getByTestId('line-area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('horizontal-bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('stacked-bar-chart')).toBeInTheDocument();
  });

  it('changes time range when filter buttons (7d, 30d, 90d) are clicked', async () => {
    const getHiringTrendsSpy = vi.spyOn(ApiService, 'getHiringTrends');

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByText(/Active Openings/i)).toBeInTheDocument();
    });

    // Click 7d button
    const btn7d = screen.getByRole('button', { name: '7 Days' });
    fireEvent.click(btn7d);

    await waitFor(() => {
      expect(getHiringTrendsSpy).toHaveBeenCalledWith('7d');
    });

    // Click 90d button
    const btn90d = screen.getByRole('button', { name: '90 Days' });
    fireEvent.click(btn90d);

    await waitFor(() => {
      expect(getHiringTrendsSpy).toHaveBeenCalledWith('90d');
    });
  });

  it('calls onNavigateToJobs when the browse jobs action button is clicked', async () => {
    const handleNavigate = vi.fn();
    renderWithContext({ onNavigateToJobs: handleNavigate });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Explore Open Positions/i })).toBeInTheDocument();
    });

    const browseBtn = screen.getByRole('button', { name: /Explore Open Positions/i });
    fireEvent.click(browseBtn);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
  });

  it('handles error state and allows retrying fetch', async () => {
    const getHiringTrendsSpy = vi
      .spyOn(ApiService, 'getHiringTrends')
      .mockRejectedValueOnce(new Error('Network error loading hiring trends'));

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId('hiring-trends-error')).toBeInTheDocument();
      expect(screen.getByText(/Network error loading hiring trends/i)).toBeInTheDocument();
    });

    // Click retry button
    const retryBtn = screen.getByRole('button', { name: /Retry Loading/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(getHiringTrendsSpy).toHaveBeenCalledTimes(2);
    });
  });
});
