import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiMatchBadge } from '../components/discover/AiMatchBadge';
import { JobCard } from '../components/discover/JobCard';
import { Job } from '../types';

const sampleJob: Job = {
  job_id: 'job_react_101',
  title: 'Senior Frontend Engineer',
  company: 'TechCorp Labs',
  location: 'Remote, US',
  salary_range: '$150k - $180k',
  description: 'Join our core platform engineering team building next-gen web experiences.',
  skills_required: ['React', 'TypeScript', 'Tailwind CSS'],
  primary_tools: ['React', 'TypeScript', 'Tailwind CSS'],
  posted_at: new Date().toISOString(),
};

describe('AiMatchBadge Component & JobCard Integration', () => {
  describe('Range Styling & Values', () => {
    it('renders correctly for High Match range (>= 80%) with emerald styling', () => {
      render(<AiMatchBadge match_percentage={92} />);

      const badge = screen.getByTestId('ai-match-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('92% Match');
      expect(badge).toHaveAttribute('data-range', 'high');
      expect(badge).toHaveAttribute('data-score', '92');
    });

    it('normalizes decimal fractions (0.85 -> 85% Match) in high range', () => {
      render(<AiMatchBadge match_percentage={0.85} />);

      const badge = screen.getByTestId('ai-match-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('85% Match');
      expect(badge).toHaveAttribute('data-range', 'high');
    });

    it('renders correctly for Medium Match range (60% - 79%) with amber styling', () => {
      render(<AiMatchBadge match_percentage={74} />);

      const badge = screen.getByTestId('ai-match-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('74% Match');
      expect(badge).toHaveAttribute('data-range', 'medium');
      expect(badge).toHaveAttribute('data-score', '74');
    });

    it('renders correctly for Low Match range (< 60%) with neutral/slate styling', () => {
      render(<AiMatchBadge match_percentage={52} />);

      const badge = screen.getByTestId('ai-match-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('52% Match');
      expect(badge).toHaveAttribute('data-range', 'low');
      expect(badge).toHaveAttribute('data-score', '52');
    });

    it('renders nothing when match_percentage is undefined or null', () => {
      const { container: containerUndef } = render(<AiMatchBadge match_percentage={undefined} />);
      expect(containerUndef).toBeEmptyDOMElement();
      expect(screen.queryByTestId('ai-match-badge')).not.toBeInTheDocument();

      const { container: containerNull } = render(<AiMatchBadge match_percentage={null} />);
      expect(containerNull).toBeEmptyDOMElement();
    });
  });

  describe('JobCard Integration', () => {
    it('displays AiMatchBadge on JobCard when match_percentage prop is provided', () => {
      render(<JobCard job={sampleJob} match_percentage={95} />);

      const badge = screen.getByTestId('ai-match-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('95% Match');
      expect(badge).toHaveAttribute('data-range', 'high');
    });

    it('displays AiMatchBadge on JobCard when match score exists on job model', () => {
      const jobWithMatch: Job = {
        ...sampleJob,
        match_score: 88,
      };

      render(<JobCard job={jobWithMatch} />);

      const badge = screen.getByTestId('ai-match-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('88% Match');
    });

    it('renders JobCard without AiMatchBadge when no match percentage or score is available', () => {
      const plainJob: Job = {
        ...sampleJob,
        match_score: undefined,
        ats_match_score: undefined,
      };

      render(<JobCard job={plainJob} />);

      expect(screen.queryByTestId('ai-match-badge')).not.toBeInTheDocument();
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    });
  });
});
