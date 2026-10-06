import { describe, it, expect } from 'vitest';
import {
  STATUS_META,
  ALLOWED_TRANSITIONS,
  canTransition,
  pipelineStageToStatus,
  statusToPipelineStage,
  isTerminal,
} from '../utils/applicationStatus';
import { ApplicationStatus, PipelineStage } from '../types';

describe('Application Status & Lifecycle Transition Engine', () => {
  const allStatuses: ApplicationStatus[] = [
    'saved',
    'applied',
    'shortlisted',
    'interview',
    'offered',
    'rejected',
  ];

  describe('Status Metadata & Configuration', () => {
    it('defines rich visual metadata for all canonical statuses', () => {
      allStatuses.forEach((status) => {
        const meta = STATUS_META[status];
        expect(meta).toBeDefined();
        expect(meta.label).toBeTruthy();
        expect(meta.badgeClass).toBeTruthy();
        expect(meta.dotClass).toBeTruthy();
        expect(meta.borderClass).toBeTruthy();
        expect(meta.description).toBeTruthy();
      });
    });

    it('identifies rejected as the terminal state', () => {
      expect(isTerminal('rejected')).toBe(true);
      expect(isTerminal('saved')).toBe(false);
      expect(isTerminal('applied')).toBe(false);
      expect(isTerminal('shortlisted')).toBe(false);
      expect(isTerminal('interview')).toBe(false);
      expect(isTerminal('offered')).toBe(false);
    });
  });

  describe('Transition Validation (canTransition)', () => {
    it('disallows transitions from identical source to target status', () => {
      allStatuses.forEach((status) => {
        expect(canTransition(status, status)).toBe(false);
      });
    });

    it('disallows any transition from a terminal state', () => {
      allStatuses.forEach((target) => {
        expect(canTransition('rejected', target)).toBe(false);
      });
    });

    it('validates canonical forward progressions', () => {
      expect(canTransition('saved', 'applied')).toBe(true);
      expect(canTransition('applied', 'shortlisted')).toBe(true);
      expect(canTransition('shortlisted', 'interview')).toBe(true);
      expect(canTransition('interview', 'offered')).toBe(true);
      expect(canTransition('interview', 'rejected')).toBe(true);
      expect(canTransition('offered', 'rejected')).toBe(true);
    });

    it('disallows invalid backwards or skip transitions', () => {
      expect(canTransition('saved', 'offered')).toBe(false);
      expect(canTransition('saved', 'interview')).toBe(false);
      expect(canTransition('applied', 'saved')).toBe(false);
      expect(canTransition('offered', 'saved')).toBe(false);
    });

    describe('Role-Based Transition Constraints', () => {
      it('allows candidates to fast-apply from saved status', () => {
        expect(canTransition('saved', 'applied', 'candidate')).toBe(true);
      });

      it('allows candidates to withdraw application to rejected from active states', () => {
        expect(canTransition('saved', 'rejected', 'candidate')).toBe(true);
        expect(canTransition('applied', 'rejected', 'candidate')).toBe(true);
        expect(canTransition('shortlisted', 'rejected', 'candidate')).toBe(true);
        expect(canTransition('interview', 'rejected', 'candidate')).toBe(true);
        expect(canTransition('offered', 'rejected', 'candidate')).toBe(true);
      });

      it('prohibits candidates from self-shortlisting or moving themselves to interview/offer', () => {
        expect(canTransition('applied', 'shortlisted', 'candidate')).toBe(false);
        expect(canTransition('applied', 'interview', 'candidate')).toBe(false);
        expect(canTransition('shortlisted', 'interview', 'candidate')).toBe(false);
        expect(canTransition('interview', 'offered', 'candidate')).toBe(false);
      });

      it('allows recruiters to promote candidate applications through pipeline stages', () => {
        expect(canTransition('applied', 'shortlisted', 'recruiter')).toBe(true);
        expect(canTransition('shortlisted', 'interview', 'recruiter')).toBe(true);
        expect(canTransition('interview', 'offered', 'recruiter')).toBe(true);
        expect(canTransition('interview', 'rejected', 'recruiter')).toBe(true);
      });
    });
  });

  describe('Two-Way PipelineStage Mapping', () => {
    const stageStatusPairs: [PipelineStage, ApplicationStatus][] = [
      ['New', 'applied'],
      ['Shortlisted', 'shortlisted'],
      ['Interviewing', 'interview'],
      ['Offered', 'offered'],
      ['Rejected', 'rejected'],
    ];

    it('accurately maps recruiter PipelineStage to canonical ApplicationStatus', () => {
      stageStatusPairs.forEach(([stage, status]) => {
        expect(pipelineStageToStatus(stage)).toBe(status);
      });
    });

    it('accurately maps canonical ApplicationStatus to recruiter PipelineStage', () => {
      stageStatusPairs.forEach(([stage, status]) => {
        expect(statusToPipelineStage(status)).toBe(stage);
      });
      // Saved state also maps to 'New' pipeline bucket
      expect(statusToPipelineStage('saved')).toBe('New');
    });
  });
});
