import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ApplicationTrackingBoard } from '../components/applications/ApplicationTrackingBoard';
import { ApplicationItem } from '../types/milestone4';
import { ToastProvider } from '../context/ToastContext';

const mockApplications: ApplicationItem[] = [
  {
    id: 'app-01',
    job_id: 'job-01',
    candidate_id: 'cand-01',
    company: 'Stripe',
    title: 'Senior Frontend Engineer',
    location: 'San Francisco, CA',
    salary: '$160k - $190k',
    match_score: 94,
    status: 'interviewing',
    applied_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-04T12:00:00Z',
    status_history: [
      {
        id: 'h-1',
        from_status: null,
        to_status: 'applied',
        changed_at: '2026-03-01T10:00:00Z',
        actor: 'candidate',
        note: 'Submitted application',
      },
      {
        id: 'h-2',
        from_status: 'applied',
        to_status: 'interviewing',
        changed_at: '2026-03-04T12:00:00Z',
        actor: 'recruiter',
        note: 'Interviewing stage',
      },
    ],
  },
  {
    id: 'app-02',
    job_id: 'job-02',
    candidate_id: 'cand-01',
    company: 'Vercel',
    title: 'Full Stack Architect',
    location: 'Remote',
    salary: '$170k - $210k',
    match_score: 89,
    status: 'technical_assessment',
    applied_at: '2026-03-02T10:00:00Z',
    updated_at: '2026-03-05T14:00:00Z',
    status_history: [],
  },
  {
    id: 'app-03',
    job_id: 'job-03',
    candidate_id: 'cand-01',
    company: 'Supabase',
    title: 'DX Engineer',
    location: 'Remote',
    salary: '$140k - $175k',
    match_score: 91,
    status: 'offer_extended',
    applied_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-06T16:00:00Z',
    status_history: [],
  },
];

describe('ApplicationTrackingBoard Component', () => {
  it('renders all 6 canonical Kanban column headers', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <ToastProvider>
        <ApplicationTrackingBoard
          applications={mockApplications}
          onRefresh={onRefresh}
        />
      </ToastProvider>
    );

    expect(screen.getByText('Applied')).toBeDefined();
    expect(screen.getByText('Under Review')).toBeDefined();
    expect(screen.getByText('Interviewing')).toBeDefined();
    expect(screen.getByText('Tech Assessment')).toBeDefined();
    expect(screen.getByText('Offer Extended')).toBeDefined();
    expect(screen.getByText('Archived / Rejected')).toBeDefined();
  });

  it('renders application cards with company and job titles', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <ToastProvider>
        <ApplicationTrackingBoard
          applications={mockApplications}
          onRefresh={onRefresh}
        />
      </ToastProvider>
    );

    expect(screen.getByText('Stripe')).toBeDefined();
    expect(screen.getByText('Senior Frontend Engineer')).toBeDefined();
    expect(screen.getByText('Vercel')).toBeDefined();
    expect(screen.getByText('Full Stack Architect')).toBeDefined();
    expect(screen.getByText('Supabase')).toBeDefined();
  });

  it('filters applications using the search bar', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <ToastProvider>
        <ApplicationTrackingBoard
          applications={mockApplications}
          onRefresh={onRefresh}
        />
      </ToastProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Filter applications/i);
    fireEvent.change(searchInput, { target: { value: 'Stripe' } });

    expect(screen.getByText('Stripe')).toBeDefined();
    expect(screen.queryByText('Vercel')).toBeNull();
    expect(screen.queryByText('Supabase')).toBeNull();
  });

  it('opens history drawer when an application card is clicked', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <ToastProvider>
        <ApplicationTrackingBoard
          applications={mockApplications}
          onRefresh={onRefresh}
        />
      </ToastProvider>
    );

    const card = screen.getByTestId('app-card-app-01');
    fireEvent.click(card);

    expect(screen.getByText(/Audit Trail & Status Progression/i)).toBeDefined();
    expect(screen.getByText('"Submitted application"')).toBeDefined();
    expect(screen.getByText('"Interviewing stage"')).toBeDefined();
  });
});
