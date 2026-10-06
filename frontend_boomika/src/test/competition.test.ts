import { describe, it, expect } from 'vitest';
import {
  COMPETITION_THRESHOLDS,
  EARLY_APPLICANT_WINDOW_HOURS,
  EARLY_APPLICANT_MAX_APPLICANTS,
  getCompetitionLevel,
  isEarlyApplicant,
  getPostedLabel,
} from '../utils/competition';

describe('Competition & Freshness Intelligence Engine', () => {
  const FIXED_NOW = new Date('2026-10-05T12:00:00Z').getTime();

  describe('Competition Level Determination (getCompetitionLevel)', () => {
    it('verifies competition thresholds configuration constants', () => {
      expect(COMPETITION_THRESHOLDS.lowMax).toBe(9);
      expect(COMPETITION_THRESHOLDS.mediumMax).toBe(29);
      expect(EARLY_APPLICANT_WINDOW_HOURS).toBe(48);
      expect(EARLY_APPLICANT_MAX_APPLICANTS).toBe(20);
    });

    it('classifies applicant counts accurately against boundary thresholds', () => {
      // Low competition: 0..9 applicants
      expect(getCompetitionLevel({ applicant_count: 0 })).toBe('low');
      expect(getCompetitionLevel({ applicant_count: 5 })).toBe('low');
      expect(getCompetitionLevel({ applicant_count: 9 })).toBe('low');

      // Medium competition: 10..29 applicants
      expect(getCompetitionLevel({ applicant_count: 10 })).toBe('medium');
      expect(getCompetitionLevel({ applicant_count: 20 })).toBe('medium');
      expect(getCompetitionLevel({ applicant_count: 29 })).toBe('medium');

      // High competition: >= 30 applicants
      expect(getCompetitionLevel({ applicant_count: 30 })).toBe('high');
      expect(getCompetitionLevel({ applicant_count: 150 })).toBe('high');
    });

    it('prioritizes explicit backend competition_level over applicant_count calculation', () => {
      expect(
        getCompetitionLevel({
          applicant_count: 5,
          competition_level: 'high',
        })
      ).toBe('high');

      expect(
        getCompetitionLevel({
          applicant_count: 100,
          competition_level: 'low',
        })
      ).toBe('low');
    });

    it('gracefully handles missing or null job inputs', () => {
      expect(getCompetitionLevel(null)).toBe('low');
      expect(getCompetitionLevel({})).toBe('low');
      expect(getCompetitionLevel({ applicant_count: undefined })).toBe('low');
    });
  });

  describe('Early Applicant Eligibility (isEarlyApplicant)', () => {
    it('identifies fresh postings with low applicant counts as early-applicant eligible', () => {
      // 12 hours ago with 5 applicants -> Eligible
      const postedAt = new Date(FIXED_NOW - 12 * 3600 * 1000).toISOString();
      expect(
        isEarlyApplicant({ posted_at: postedAt, applicant_count: 5 }, FIXED_NOW)
      ).toBe(true);
    });

    it('validates window boundary conditions (48 hours)', () => {
      // Exactly 48 hours ago with 20 applicants -> Eligible
      const postedAt48h = new Date(FIXED_NOW - 48 * 3600 * 1000).toISOString();
      expect(
        isEarlyApplicant({ posted_at: postedAt48h, applicant_count: 20 }, FIXED_NOW)
      ).toBe(true);

      // 49 hours ago -> Ineligible regardless of applicant count
      const postedAt49h = new Date(FIXED_NOW - 49 * 3600 * 1000).toISOString();
      expect(
        isEarlyApplicant({ posted_at: postedAt49h, applicant_count: 2 }, FIXED_NOW)
      ).toBe(false);
    });

    it('disqualifies postings exceeding applicant threshold within window', () => {
      // 10 hours ago but has 25 applicants -> Ineligible (too many applicants)
      const postedAt10h = new Date(FIXED_NOW - 10 * 3600 * 1000).toISOString();
      expect(
        isEarlyApplicant({ posted_at: postedAt10h, applicant_count: 25 }, FIXED_NOW)
      ).toBe(false);
    });

    it('respects explicit early_applicant boolean property when provided', () => {
      expect(isEarlyApplicant({ early_applicant: true }, FIXED_NOW)).toBe(true);
      expect(isEarlyApplicant({ early_applicant: false }, FIXED_NOW)).toBe(false);
    });

    it('handles invalid or missing dates gracefully', () => {
      expect(isEarlyApplicant(null, FIXED_NOW)).toBe(false);
      expect(isEarlyApplicant({}, FIXED_NOW)).toBe(false);
      expect(isEarlyApplicant({ posted_at: 'invalid-date-string' }, FIXED_NOW)).toBe(false);
    });
  });

  describe('Human-Readable Freshness Labels (getPostedLabel)', () => {
    it('formats relative elapsed time accurately', () => {
      // 15 minutes ago
      const t15m = new Date(FIXED_NOW - 15 * 60 * 1000).toISOString();
      expect(getPostedLabel(t15m, FIXED_NOW)).toBe('Just now');

      // 5 hours ago
      const t5h = new Date(FIXED_NOW - 5 * 3600 * 1000).toISOString();
      expect(getPostedLabel(t5h, FIXED_NOW)).toBe('5h ago');

      // 28 hours ago -> 1d ago
      const t28h = new Date(FIXED_NOW - 28 * 3600 * 1000).toISOString();
      expect(getPostedLabel(t28h, FIXED_NOW)).toBe('1d ago');

      // 3 days ago
      const t3d = new Date(FIXED_NOW - 3 * 24 * 3600 * 1000).toISOString();
      expect(getPostedLabel(t3d, FIXED_NOW)).toBe('3d ago');

      // 14 days ago -> 2w ago
      const t14d = new Date(FIXED_NOW - 14 * 24 * 3600 * 1000).toISOString();
      expect(getPostedLabel(t14d, FIXED_NOW)).toBe('2w ago');

      // 45 days ago -> 1mo ago
      const t45d = new Date(FIXED_NOW - 45 * 24 * 3600 * 1000).toISOString();
      expect(getPostedLabel(t45d, FIXED_NOW)).toBe('1mo ago');
    });

    it('returns "Recently" on invalid or missing date inputs', () => {
      expect(getPostedLabel(null, FIXED_NOW)).toBe('Recently');
      expect(getPostedLabel(undefined, FIXED_NOW)).toBe('Recently');
      expect(getPostedLabel('invalid-date', FIXED_NOW)).toBe('Recently');
    });
  });
});
