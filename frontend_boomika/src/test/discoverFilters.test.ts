import { describe, it, expect } from 'vitest';
import { filterJobsList } from '../hooks/useJobFeed';
import { Job } from '../types';
import { FiltersState } from '../components/discover/FiltersPanel';

describe('Discovery Feed Filters & Low-Competition / Recent Wiring', () => {
  const sampleJobs: Job[] = [
    {
      job_id: 1,
      title: 'Senior Frontend Engineer',
      company: 'Stripe',
      location: 'San Francisco, CA',
      salary_range: '$160k - $200k',
      description: 'Building world-class developer tools with React and TypeScript.',
      primary_tools: ['React', 'TypeScript'],
      skills_required: ['React', 'TypeScript'],
      posted_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4h ago
      applicant_count: 6, // Low competition (<10)
      competition_level: 'low',
      company_type: 'High-Growth Startup',
      work_environment: 'Remote',
    },
    {
      job_id: 2,
      title: 'Full Stack Architect',
      company: 'Enterprise Corp',
      location: 'New York, NY',
      salary_range: '$180k - $220k',
      description: 'Enterprise architecture with Java and Angular.',
      primary_tools: ['Java', 'Angular'],
      skills_required: ['Java', 'Angular'],
      posted_at: new Date(Date.now() - 96 * 3600 * 1000).toISOString(), // 4d ago
      applicant_count: 42, // High competition (>=30)
      competition_level: 'high',
      company_type: 'MNC',
      work_environment: 'On-site',
    },
    {
      job_id: 3,
      title: 'Junior UI Developer',
      company: 'Seed Startup',
      location: 'Austin, TX',
      salary_range: '$90k - $120k',
      description: 'Fresher-friendly frontend position for eager learners.',
      primary_tools: ['HTML', 'CSS', 'JavaScript'],
      skills_required: ['JavaScript', 'Tailwind'],
      posted_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // 12h ago
      applicant_count: 8, // Low competition
      competition_level: 'low',
      company_type: 'Seed-Stage',
      work_environment: 'Hybrid',
      is_fresher_friendly: true,
    },
  ];

  const baseFilters: FiltersState = {
    searchQuery: '',
    companyTypes: [],
    workEnvironments: [],
    minSalary: 0,
    fresherFriendly: false,
    lowCompetition: false,
    recentlyPosted: false,
  };

  it('filters by low competition accurately (< 10 applicants)', () => {
    const filters: FiltersState = {
      ...baseFilters,
      lowCompetition: true,
    };

    const results = filterJobsList(sampleJobs, filters);
    expect(results.length).toBe(2);
    expect(results.map((j) => j.job_id)).toEqual([1, 3]);
  });

  it('filters by recently posted (< 48 hours window)', () => {
    const filters: FiltersState = {
      ...baseFilters,
      recentlyPosted: true,
    };

    const results = filterJobsList(sampleJobs, filters);
    expect(results.length).toBe(2);
    expect(results.map((j) => j.job_id)).toEqual([1, 3]);
  });

  it('filters by fresher friendly flag', () => {
    const filters: FiltersState = {
      ...baseFilters,
      fresherFriendly: true,
    };

    const results = filterJobsList(sampleJobs, filters);
    expect(results.length).toBe(1);
    expect(results[0].job_id).toBe(3);
  });

  it('combines company type and work environment filters', () => {
    const filters: FiltersState = {
      ...baseFilters,
      companyTypes: ['MNC'],
      workEnvironments: ['On-site'],
    };

    const results = filterJobsList(sampleJobs, filters);
    expect(results.length).toBe(1);
    expect(results[0].company).toBe('Enterprise Corp');
  });

  it('filters by search keyword matching title, company, or skills', () => {
    const filters: FiltersState = {
      ...baseFilters,
      searchQuery: 'Stripe',
    };

    const results = filterJobsList(sampleJobs, filters);
    expect(results.length).toBe(1);
    expect(results[0].company).toBe('Stripe');
  });
});
