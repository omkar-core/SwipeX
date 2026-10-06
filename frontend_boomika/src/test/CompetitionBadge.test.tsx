import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompetitionBadge } from '../components/discover/CompetitionBadge';
import { PostedTimeLabel } from '../components/discover/PostedTimeLabel';
import { EarlyApplicantBadge } from '../components/discover/EarlyApplicantBadge';

describe('Competition & Freshness UI Indicators', () => {
  describe('CompetitionBadge Component', () => {
    it('renders Low Competition badge with emerald styling for applicant count < 10', () => {
      render(<CompetitionBadge applicant_count={6} />);

      const badge = screen.getByTestId('competition-badge');
      expect(badge).toHaveTextContent('6 Applicants (Low Competition)');
      expect(badge.className).toContain('text-emerald-700');
    });

    it('renders Medium Competition badge for applicant count between 10 and 29', () => {
      render(<CompetitionBadge applicant_count={18} />);

      const badge = screen.getByTestId('competition-badge');
      expect(badge).toHaveTextContent('18 Applicants (Medium Competition)');
      expect(badge.className).toContain('text-amber-700');
    });

    it('renders High Competition badge for applicant count >= 30', () => {
      render(<CompetitionBadge applicant_count={45} />);

      const badge = screen.getByTestId('competition-badge');
      expect(badge).toHaveTextContent('45 Applicants (High Competition)');
      expect(badge.className).toContain('text-rose-700');
    });
  });

  describe('EarlyApplicantBadge Component', () => {
    const fixedNow = new Date('2026-10-05T12:00:00Z').getTime();

    it('renders early applicant badge when posting is recent and has low applicant count', () => {
      const recentDate = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      render(<EarlyApplicantBadge job={{ posted_at: recentDate, applicant_count: 5 }} />);

      const badge = screen.getByTestId('early-applicant-badge');
      expect(badge).toHaveTextContent('Early Applicant');
    });

    it('does not render when posting exceeds window hours', () => {
      const oldDate = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
      const { container } = render(
        <EarlyApplicantBadge job={{ posted_at: oldDate, applicant_count: 3 }} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('PostedTimeLabel Component', () => {
    it('renders formatted relative time label', () => {
      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      render(<PostedTimeLabel posted_at={oneHourAgo} />);

      const label = screen.getByTestId('posted-time-label');
      expect(label).toHaveTextContent(/1h ago|Just now/);
    });
  });
});
