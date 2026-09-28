import { describe, it, expect } from 'vitest';
import { AtsService } from '../services/atsService';
import { ResumeVersion, Job } from '../types';

describe('AtsService & 80% Threshold Compatibility Engine', () => {
  const mockResume: ResumeVersion = {
    resume_id: 'res_test_1',
    version: 3,
    filename: 'Alex_Frontend.pdf',
    uploaded_at: '2026-09-24T00:00:00Z',
    is_default: true,
    parse_status: 'parsed',
    parsed_skills: ['React 19', 'TypeScript', 'Tailwind CSS', 'Next.js 15', 'Framer Motion'],
    extracted_skills: ['React 19', 'TypeScript', 'Tailwind CSS', 'Next.js 15', 'Framer Motion'],
    overall_fit_score: 88,
    format_compatibility: 'High'
  };

  const highMatchJob: Job = {
    job_id: 101,
    title: 'Senior React Developer',
    company: 'TechCorp Labs',
    location: 'Remote, US',
    salary_range: '$140k - $170k',
    description: 'Looking for a Senior React Engineer with Next.js and TypeScript expertise.',
    skills_required: ['React', 'TypeScript', 'Tailwind CSS'],
    primary_tools: ['React', 'TypeScript'],
    posted_at: '2 days ago'
  };

  const lowMatchJob: Job = {
    job_id: 202,
    title: 'Distributed Systems & Go Specialist',
    company: 'CloudScale Inc',
    location: 'San Francisco, CA',
    salary_range: '$180k - $220k',
    description: 'Looking for Go, Kubernetes, Kafka and Rust experts.',
    skills_required: ['Go', 'Kubernetes', 'Kafka', 'Rust', 'gRPC'],
    primary_tools: ['Go', 'Kubernetes'],
    posted_at: '1 day ago'
  };

  it('calculates high ATS match score (>= 80%) with interview readiness', () => {
    const result = AtsService.calculateRealtimeAtsScore(mockResume, highMatchJob);

    expect(result.match_score).toBeGreaterThanOrEqual(80);
    expect(result.is_interview_ready).toBe(true);
    expect(result.benchmark_threshold).toBe(80);
  });

  it('identifies missing skills and keywords when match is below 80%', () => {
    const result = AtsService.calculateRealtimeAtsScore(mockResume, lowMatchJob);

    expect(result.match_score).toBeLessThan(80);
    expect(result.is_interview_ready).toBe(false);
    expect(result.missing_skills.length).toBeGreaterThan(0);
    expect(result.missing_keywords.length).toBeGreaterThan(0);
  });

  it('generates contextual AI coaching suggestions based on gap analysis', async () => {
    const suggestions = await AtsService.getAiSuggestions('res_test_1', '101');
    expect(suggestions).toBeDefined();
    expect(suggestions.suggestions.length).toBeGreaterThan(0);
    expect(suggestions.suggestions[0].recommended_text).toBeDefined();
  });
});
