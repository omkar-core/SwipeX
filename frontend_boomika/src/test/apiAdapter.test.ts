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
});
