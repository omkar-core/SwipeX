import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResumePerformancePanel } from '../components/analytics/ResumePerformancePanel';
import { ResumePerformanceItem } from '../types/milestone4';

describe('ResumePerformancePanel Component (FR-06)', () => {
  const mockPerformance: ResumePerformanceItem[] = [
    {
      resume_id: 'res-v1',
      version_label: 'Frontend Specialist v1.0',
      views: 42,
      applies: 18,
      shortlists: 9,
      interviews: 4,
      shortlist_rate: 50,
    },
    {
      resume_id: 'res-v2',
      version_label: 'Full Stack React v2.1',
      views: 28,
      applies: 12,
      shortlists: 3,
      interviews: 1,
      shortlist_rate: 25,
    },
  ];

  it('renders empty state when no resume performance data exists', () => {
    const handleNavigate = vi.fn();
    render(<ResumePerformancePanel performance={[]} onNavigateToResume={handleNavigate} />);

    expect(screen.getByTestId('resume-performance-empty')).toBeInTheDocument();
    expect(screen.getByText(/Resume Version Performance Insights/i)).toBeInTheDocument();

    const uploadBtn = screen.getByRole('button', { name: /Upload & Manage Resumes/i });
    fireEvent.click(uploadBtn);
    expect(handleNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders resume versions with metrics and marks the best performing version', () => {
    render(<ResumePerformancePanel performance={mockPerformance} />);

    expect(screen.getByTestId('resume-performance-panel')).toBeInTheDocument();
    expect(screen.getByText('Frontend Specialist v1.0')).toBeInTheDocument();
    expect(screen.getByText('Full Stack React v2.1')).toBeInTheDocument();

    // Verify best performer badge
    expect(screen.getByText(/Best Performer/i)).toBeInTheDocument();
    expect(screen.getByTestId('best-performer-badge')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText(/Shortlist Conversion Rate/i).length).toBeGreaterThan(0);
  });

  it('navigates to resume versions manager when header link is clicked', () => {
    const handleNavigate = vi.fn();
    render(
      <ResumePerformancePanel
        performance={mockPerformance}
        onNavigateToResume={handleNavigate}
      />
    );

    const manageBtn = screen.getByRole('button', { name: /Manage Versions/i });
    fireEvent.click(manageBtn);
    expect(handleNavigate).toHaveBeenCalledTimes(1);
  });
});
