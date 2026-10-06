import { describe, it, expect } from 'vitest';
import { ApiAdapter, RawResumeDto, RawAtsScoreDto } from '../services/apiAdapter';

describe('ApiAdapter & Centralized Data Mapper', () => {
  describe('Resume Normalization', () => {
    it('normalizes strict assumed backend contract shape { id, version, filename, uploaded_at, is_default, parse_status, parsed_text, extracted_skills }', () => {
      const rawContract: RawResumeDto = {
        id: 'res_backend_101',
        version: 4,
        filename: 'John_Doe_2026.pdf',
        uploaded_at: '2026-09-24T12:00:00Z',
        is_default: true,
        parse_status: 'parsed',
        parsed_text: 'Experienced Full Stack Engineer with React and Node.js expertise.',
        extracted_skills: ['React 19', 'TypeScript', 'Node.js', 'PostgreSQL'],
      };

      const normalized = ApiAdapter.toResumeVersion(rawContract);

      expect(normalized.resume_id).toBe('res_backend_101');
      expect(normalized.id).toBe('res_backend_101');
      expect(normalized.version).toBe(4);
      expect(normalized.filename).toBe('John_Doe_2026.pdf');
      expect(normalized.uploaded_at).toBe('2026-09-24T12:00:00Z');
      expect(normalized.is_default).toBe(true);
      expect(normalized.parse_status).toBe('parsed');
      expect(normalized.extracted_skills).toEqual(['React 19', 'TypeScript', 'Node.js', 'PostgreSQL']);
      expect(normalized.parsed_skills).toEqual(['React 19', 'TypeScript', 'Node.js', 'PostgreSQL']);
      expect(normalized.parsed_text).toBe('Experienced Full Stack Engineer with React and Node.js expertise.');
    });

    it('gracefully maps backend field variations (resume_id, file_name, created_at, is_active, status)', () => {
      const alternativeRaw = {
        resume_id: 88,
        version_number: 2,
        file_name: 'Alternative_Format.docx',
        created_at: '2026-08-15T09:30:00Z',
        is_active: true,
        status: 'ANALYZING',
        parsed_skills: ['Python', 'FastAPI', 'Docker'],
      };

      const normalized = ApiAdapter.toResumeVersion(alternativeRaw);

      expect(normalized.resume_id).toBe('88');
      expect(normalized.version).toBe(2);
      expect(normalized.filename).toBe('Alternative_Format.docx');
      expect(normalized.uploaded_at).toBe('2026-08-15T09:30:00Z');
      expect(normalized.is_default).toBe(true);
      expect(normalized.parse_status).toBe('analyzing');
      expect(normalized.extracted_skills).toEqual(['Python', 'FastAPI', 'Docker']);
    });

    it('normalizes wrapped list payloads (items, resumes, data)', () => {
      const wrappedPayload = {
        items: [
          { id: 'res_1', filename: 'v1.pdf', version: 1, is_default: true },
          { id: 'res_2', filename: 'v2.pdf', version: 2, is_default: false },
        ]
      };

      const list = ApiAdapter.toResumeVersionList(wrappedPayload);
      expect(list).toHaveLength(2);
      expect(list[0].filename).toBe('v1.pdf');
      expect(list[1].filename).toBe('v2.pdf');
    });
  });

  describe('ATS Score Normalization & 80% Benchmark Rule', () => {
    it('normalizes assumed ATS contract: { match_score, missing_keywords: string[], missing_skills: string[] }', () => {
      const rawAts: RawAtsScoreDto = {
        match_score: 72,
        missing_keywords: ['GraphQL', 'CI/CD Pipelines'],
        missing_skills: ['Docker', 'Kubernetes'],
      };

      const result = ApiAdapter.toAtsScoreResult(rawAts, 'res_123', 'job_456');

      expect(result.resume_id).toBe('res_123');
      expect(result.job_id).toBe('job_456');
      expect(result.match_score).toBe(72);
      expect(result.benchmark_threshold).toBe(80);
      expect(result.is_interview_ready).toBe(false); // below 80%
      expect(result.missing_keywords).toEqual(['GraphQL', 'CI/CD Pipelines']);
      expect(result.missing_skills).toHaveLength(2);
      expect(result.missing_skills[0].skill).toBe('Docker');
    });

    it('identifies interview readiness when match_score >= 80%', () => {
      const highAts: RawAtsScoreDto = {
        match_score: 92,
        missing_keywords: [],
        missing_skills: [],
      };

      const result = ApiAdapter.toAtsScoreResult(highAts);

      expect(result.match_score).toBe(92);
      expect(result.is_interview_ready).toBe(true);
    });
  });

  describe('AI Suggestions Normalization', () => {
    it('normalizes wrapped or raw AI suggestions list with boost and section tags', () => {
      const rawPayload = {
        resume_id: 'res_custom_1',
        job_id: 'job_target_2',
        suggestions: [
          {
            id: 'sug_test_1',
            section: 'EXPERIENCE',
            title: 'Action Verb Impact',
            recommended_text: 'Spearheaded frontend migration to Vite, improving build times by 65%.',
            estimated_score_boost: 5,
            keywords_added: ['Vite', 'Build optimization'],
          },
          {
            id: 'sug_test_2',
            section: 'skills',
            title: 'Add TypeScript',
            recommended_text: 'TypeScript 5.x',
            boost: 4,
          }
        ]
      };

      const result = ApiAdapter.toAiSuggestionsResult(rawPayload);

      expect(result.resume_id).toBe('res_custom_1');
      expect(result.job_id).toBe('job_target_2');
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].section).toBe('Experience');
      expect(result.suggestions[0].estimated_score_boost).toBe(5);
      expect(result.suggestions[1].section).toBe('Skills');
      expect(result.suggestions[1].estimated_score_boost).toBe(4);
    });
  });

  describe('Job Recommendations Normalization', () => {
    it('normalizes 0-1 decimal range to 0-100 percentage', () => {
      const decimalRecommendation = {
        job_id: 'job_44',
        match_percentage: 0.94,
        generated_by: 'TestRanker'
      };

      const normalized = ApiAdapter.toJobRecommendation(decimalRecommendation);

      expect(normalized.job_id).toBe('job_44');
      expect(normalized.match_percentage).toBe(94);
    });

    it('normalizes wrapped recommendations list', () => {
      const wrapped = {
        recommendations: [
          { id: '101', score: 85 },
          { id: '102', match_percentage: 92 }
        ]
      };

      const list = ApiAdapter.toJobRecommendationList(wrapped);
      expect(list).toHaveLength(2);
      expect(list[0].job_id).toBe('101');
      expect(list[0].match_percentage).toBe(85);
      expect(list[1].job_id).toBe('102');
      expect(list[1].match_percentage).toBe(92);
    });
  });

  describe('Notification & Preferences Normalization', () => {
    it('normalizes raw notification DTO and decimal match percentages', () => {
      const rawNotif = {
        notification_id: 'notif_abc',
        category: 'high_match',
        heading: 'Top Match Role',
        body: 'You scored 94% on Stripe posting',
        match_score: 0.94,
        is_read: false,
      };

      const normalized = ApiAdapter.toNotification(rawNotif);

      expect(normalized.id).toBe('notif_abc');
      expect(normalized.type).toBe('high_match');
      expect(normalized.title).toBe('Top Match Role');
      expect(normalized.message).toBe('You scored 94% on Stripe posting');
      expect(normalized.match_percentage).toBe(94);
      expect(normalized.read).toBe(false);
    });

    it('normalizes wrapped notification list payloads and computes unread count', () => {
      const rawListPayload = {
        items: [
          { id: 'n1', title: 'N1', is_read: false },
          { id: 'n2', title: 'N2', is_read: true },
          { id: 'n3', title: 'N3', is_read: false },
        ],
        next_cursor: 'cursor_page_2',
      };

      const adapted = ApiAdapter.toNotificationList(rawListPayload);

      expect(adapted.items).toHaveLength(3);
      expect(adapted.unread_count).toBe(2);
      expect(adapted.next_cursor).toBe('cursor_page_2');
    });

    it('normalizes alert preferences and applies fallback defaults', () => {
      const partialPrefs = {
        match_threshold: 88,
        quiet_hours: {
          enabled: true,
          start: '23:00',
          end: '07:00',
        },
      };

      const adapted = ApiAdapter.toAlertPreferences(partialPrefs);

      expect(adapted.match_threshold).toBe(88);
      expect(adapted.types.high_match).toBe(true);
      expect(adapted.types.low_competition).toBe(true);
      expect(adapted.channels.in_app).toBe(true);
      expect(adapted.quiet_hours.start).toBe('23:00');
    });

    it('normalizes unread count from various shape keys', () => {
      expect(ApiAdapter.toUnreadCount(5)).toBe(5);
      expect(ApiAdapter.toUnreadCount({ unread_count: 7 })).toBe(7);
      expect(ApiAdapter.toUnreadCount({ unreadCount: 3 })).toBe(3);
      expect(ApiAdapter.toUnreadCount({ count: 4 })).toBe(4);
      expect(ApiAdapter.toUnreadCount({ data: { unread_count: 9 } })).toBe(9);
    });
  });

  describe('Application & Status History Normalization', () => {
    it('normalizes application DTO with stages and history timeline', () => {
      const rawApp = {
        application_id: 'app_101',
        job_id: 'job_202',
        title: 'Senior Frontend Engineer',
        company_name: 'Stripe',
        stage: 'interviewing',
        created_at: '2026-10-01T10:00:00Z',
        score: 0.94,
        history: [
          { entry_id: 'h1', status: 'applied', timestamp: '2026-10-01T10:00:00Z', actor: 'candidate' },
          { entry_id: 'h2', status: 'interviewing', timestamp: '2026-10-03T14:00:00Z', actor: 'recruiter', comment: 'Screening scheduled' },
        ],
      };

      const item = ApiAdapter.toApplicationItem(rawApp);

      expect(item.id).toBe('app_101');
      expect(item.job_id).toBe('job_202');
      expect(item.company).toBe('Stripe');
      expect(item.status).toBe('interviewing');
      expect(item.match_score).toBe(94);
      expect(item.status_history).toHaveLength(2);
      expect(item.status_history[1].note).toBe('Screening scheduled');
    });

    it('normalizes wrapped application lists', () => {
      const wrapped = {
        items: [
          { id: 'a1', job_id: 'j1', title: 'Developer', company: 'Linear', status: 'applied' },
          { id: 'a2', job_id: 'j2', title: 'Designer', company: 'Figma', status: 'offer_extended' },
        ]
      };

      const list = ApiAdapter.toApplicationList(wrapped);
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe('a1');
      expect(list[1].status).toBe('offer_extended');
    });
  });

  describe('Competition Metrics Normalization', () => {
    it('normalizes competition response and determines competition level thresholds', () => {
      const lowComp = ApiAdapter.toCompetitionData({ count: 6, score: 92 }, 'job_01');
      expect(lowComp.applicant_count).toBe(6);
      expect(lowComp.competition_level).toBe('low');
      expect(lowComp.match_percentage).toBe(92);

      const highComp = ApiAdapter.toCompetitionData({ applicant_count: 55 }, 'job_02');
      expect(highComp.applicant_count).toBe(55);
      expect(highComp.competition_level).toBe('high');
    });
  });

  describe('Analytics Normalization', () => {
    it('normalizes candidate analytics summary and funnel counts', () => {
      const rawCandidate = {
        total_swipes: 24,
        applications_sent: 10,
        profile_view_rate: 42,
        avg_match_score: 91,
        funnel_counts: {
          applied: 10,
          shortlisted: 4,
          interviewing: 2,
          offered: 1,
          rejected: 1,
        },
        top_skills_gap: [
          { skill: 'GraphQL', count: 6, percentage: 60, learn_url: 'https://graphql.org' }
        ],
        score_trend: [
          { date: 'Oct 01', score: 92, job_title: 'Frontend Engineer', company: 'Stripe' }
        ],
      };

      const adapted = ApiAdapter.toCandidateAnalytics(rawCandidate);

      expect(adapted.total_swipes).toBe(24);
      expect(adapted.applications_sent).toBe(10);
      expect(adapted.funnel_counts.applied).toBe(10);
      expect(adapted.funnel_counts.shortlisted).toBe(4);
      expect(adapted.top_skills_gap[0].skill).toBe('GraphQL');
      expect(adapted.score_trend[0].score).toBe(92);
    });

    it('normalizes recruiter analytics summary and pipeline distribution', () => {
      const rawRecruiter = {
        total_jobs_posted: 6,
        active_jobs: 4,
        total_applicants: 28,
        pipeline_distribution: {
          New: 10,
          Shortlisted: 8,
          Interviewing: 5,
          Offered: 3,
          Rejected: 2,
        },
        avg_time_to_fill_days: 14,
      };

      const adapted = ApiAdapter.toRecruiterAnalytics(rawRecruiter);

      expect(adapted.total_jobs).toBe(6);
      expect(adapted.active_jobs).toBe(4);
      expect(adapted.total_applicants).toBe(28);
      expect(adapted.stage_counts.New).toBe(10);
      expect(adapted.stage_counts.Shortlisted).toBe(8);
      expect(adapted.avg_time_to_hire_days).toBe(14);
    });

    it('normalizes hiring trends data and kpis', () => {
      const rawTrends = {
        jobs_posted: [{ date: 'Day 1', count: 12 }],
        top_skills: [{ skill: 'TypeScript', count: 88, percentage: 88 }],
        startup_vs_mnc: [{ date: 'Day 1', startup: 8, mnc: 4 }],
        kpis: {
          total_jobs: 120,
          pct_change: 15.5,
          top_skill: 'TypeScript',
          startup_share_pct: 66,
        }
      };

      const adapted = ApiAdapter.toHiringTrends(rawTrends);

      expect(adapted.jobs_posted).toHaveLength(1);
      expect(adapted.top_skills[0].skill).toBe('TypeScript');
      expect(adapted.kpis?.top_skill).toBe('TypeScript');
      expect(adapted.kpis?.startup_share_pct).toBe(66);
    });
  });
});

