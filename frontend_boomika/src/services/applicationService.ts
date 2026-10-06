import { ApplicationItem, ApplicationStatus, StatusHistoryEntry } from '../types/milestone4';
import { Job } from '../types';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { ApiAdapter } from './apiAdapter';
import { isValidTransition, STATUS_CONFIG } from '../utils/applicationStatus';
import { notificationService } from './notificationService';

const STORAGE_KEY = 'swipex_applications_v4';

const SEED_APPLICATIONS: ApplicationItem[] = [
  {
    id: 'app-seed-01',
    job_id: 'job-01',
    candidate_id: 'cand-01',
    company: 'Stripe',
    title: 'Senior Frontend Engineer',
    location: 'San Francisco, CA (Remote)',
    salary: '$160,000 - $190,000',
    match_score: 94,
    status: 'interviewing',
    applied_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    status_history: [
      {
        id: 'hist-01-1',
        from_status: null,
        to_status: 'applied',
        changed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        actor: 'candidate',
        note: 'Submitted application via 1-Tap Swipe with Resume v2 (Default)',
      },
      {
        id: 'hist-01-2',
        from_status: 'applied',
        to_status: 'under_review',
        changed_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        actor: 'recruiter',
        note: 'Application reviewed and matched 94% ATS threshold by hiring team.',
      },
      {
        id: 'hist-01-3',
        from_status: 'under_review',
        to_status: 'interviewing',
        changed_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        actor: 'recruiter',
        note: 'Screening call scheduled with Staff Engineering Manager.',
      },
    ],
  },
  {
    id: 'app-seed-02',
    job_id: 'job-02',
    candidate_id: 'cand-01',
    company: 'Vercel',
    title: 'Full Stack Next.js Architect',
    location: 'Remote (US)',
    salary: '$170,000 - $210,000',
    match_score: 89,
    status: 'technical_assessment',
    applied_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    status_history: [
      {
        id: 'hist-02-1',
        from_status: null,
        to_status: 'applied',
        changed_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        actor: 'candidate',
        note: 'Instant applied after 89% AI match score.',
      },
      {
        id: 'hist-02-2',
        from_status: 'applied',
        to_status: 'under_review',
        changed_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        actor: 'recruiter',
        note: 'Recruiter shortlisted candidate for core frontend infrastructure.',
      },
      {
        id: 'hist-02-3',
        from_status: 'under_review',
        to_status: 'technical_assessment',
        changed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        actor: 'recruiter',
        note: 'Take-home assessment on React Server Components sent.',
      },
    ],
  },
  {
    id: 'app-seed-03',
    job_id: 'job-03',
    candidate_id: 'cand-01',
    company: 'Supabase',
    title: 'Developer Experience Engineer',
    location: 'Remote (Global)',
    salary: '$140,000 - $175,000',
    match_score: 91,
    status: 'offer_extended',
    applied_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    status_history: [
      {
        id: 'hist-03-1',
        from_status: null,
        to_status: 'applied',
        changed_at: new Date(Date.now() - 14 * 86400000).toISOString(),
        actor: 'candidate',
      },
      {
        id: 'hist-03-2',
        from_status: 'applied',
        to_status: 'under_review',
        changed_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        actor: 'recruiter',
      },
      {
        id: 'hist-03-3',
        from_status: 'under_review',
        to_status: 'interviewing',
        changed_at: new Date(Date.now() - 6 * 86400000).toISOString(),
        actor: 'recruiter',
      },
      {
        id: 'hist-03-4',
        from_status: 'interviewing',
        to_status: 'offer_extended',
        changed_at: new Date(Date.now() - 6 * 3600000).toISOString(),
        actor: 'recruiter',
        note: 'Official written offer package extended with equity grant.',
      },
    ],
  },
  {
    id: 'app-seed-04',
    job_id: 'job-04',
    candidate_id: 'cand-01',
    company: 'Linear',
    title: 'Product Designer & UI Engineer',
    location: 'San Francisco / Remote',
    salary: '$150,000 - $185,000',
    match_score: 82,
    status: 'under_review',
    applied_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    status_history: [
      {
        id: 'hist-04-1',
        from_status: null,
        to_status: 'applied',
        changed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        actor: 'candidate',
      },
      {
        id: 'hist-04-2',
        from_status: 'applied',
        to_status: 'under_review',
        changed_at: new Date(Date.now() - 12 * 3600000).toISOString(),
        actor: 'recruiter',
        note: 'Portfolio under review by Design Lead.',
      },
    ],
  },
  {
    id: 'app-seed-05',
    job_id: 'job-05',
    candidate_id: 'cand-01',
    company: 'Figma',
    title: 'Design Systems Engineer',
    location: 'New York, NY (Hybrid)',
    salary: '$165,000 - $195,000',
    match_score: 79,
    status: 'applied',
    applied_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    status_history: [
      {
        id: 'hist-05-1',
        from_status: null,
        to_status: 'applied',
        changed_at: new Date(Date.now() - 8 * 3600000).toISOString(),
        actor: 'candidate',
        note: 'Submitted via Swipe right with custom tailored resume.',
      },
    ],
  },
];

class ApplicationService {
  private getStorage(): ApplicationItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_APPLICATIONS));
      return SEED_APPLICATIONS;
    } catch {
      return SEED_APPLICATIONS;
    }
  }

  private saveStorage(apps: ApplicationItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    } catch (err) {
      console.warn('Failed to persist applications to localStorage:', err);
    }
  }

  /**
   * Fetch all applications for current user with optional filters
   */
  async getApplications(filter?: {
    status?: ApplicationStatus;
    search?: string;
  }): Promise<ApplicationItem[]> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.APPLICATIONS.LIST}`, {
          headers,
        });
        if (response.ok) {
          const data = await response.json();
          const items = ApiAdapter.toApplicationList(data);
          if (items.length > 0) {
            this.saveStorage(items);
            return items;
          }
        }
      } catch (err) {
        console.warn('Live API call failed, falling back to mock applications:', err);
      }
    }

    let list = this.getStorage();
    if (filter?.status) {
      list = list.filter((a) => a.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          (a.location && a.location.toLowerCase().includes(q))
      );
    }
    return list;
  }

  /**
   * Fetch single application by ID
   */
  async getApplicationById(id: string): Promise<ApplicationItem | null> {
    const list = this.getStorage();
    const app = list.find((a) => a.id === id || a.job_id === id);
    return app || null;
  }

  /**
   * Fetch application status transition history
   */
  async getStatusHistory(id: string): Promise<StatusHistoryEntry[]> {
    if (!API_CONFIG.USE_MOCK) {
      try {
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.APPLICATIONS.HISTORY(id)}`, {
          headers,
        });
        if (response.ok) {
          const data = await response.json();
          return ApiAdapter.toStatusHistoryList(data);
        }
      } catch (err) {
        console.warn('Live getStatusHistory call failed, using local history:', err);
      }
    }

    const app = await this.getApplicationById(id);
    return app?.status_history || [];
  }

  /**
   * Create new application when candidate swipes right or applies
   */
  async createApplication(
    job: Partial<Job> & { id: string | number; title?: string; company?: string; salary?: string },
    matchScore: number = 85,
    note?: string
  ): Promise<ApplicationItem> {
    const list = this.getStorage();
    const existing = list.find((a) => a.job_id === String(job.id));
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newApp: ApplicationItem = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      job_id: String(job.id),
      candidate_id: 'cand-01',
      company: job.company || 'Company',
      title: job.title || 'Role',
      location: job.location,
      salary: job.salary,
      match_score: matchScore,
      status: 'applied',
      applied_at: now,
      updated_at: now,
      status_history: [
        {
          id: `hist-${Date.now()}-0`,
          from_status: null,
          to_status: 'applied',
          changed_at: now,
          actor: 'candidate',
          note: note || 'Applied directly via SwipeX match feed.',
        },
      ],
    };

    const updated = [newApp, ...list];
    this.saveStorage(updated);

    if (!API_CONFIG.USE_MOCK) {
      try {
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.APPLICATIONS.APPLY}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            job_id: String(job.id),
            match_score: matchScore,
            notes: note,
          }),
        });
      } catch (err) {
        console.warn('Backend application creation failed, local state preserved:', err);
      }
    }

    return newApp;
  }

  /**
   * Update application stage with history log and optional notification trigger
   */
  async updateStatus(
    id: string,
    newStatus: ApplicationStatus,
    note?: string,
    actor: 'candidate' | 'recruiter' | 'system' = 'candidate',
    force: boolean = false
  ): Promise<ApplicationItem> {
    const list = this.getStorage();
    const index = list.findIndex((a) => a.id === id || a.job_id === id);

    if (index === -1) {
      throw new Error(`Application with ID ${id} not found.`);
    }

    const currentApp = list[index];
    const oldStatus = currentApp.status;

    // Validate state transition unless force override is requested
    if (!force && oldStatus !== newStatus && !isValidTransition(oldStatus, newStatus)) {
      throw new Error(
        `Invalid status transition from "${STATUS_CONFIG[oldStatus]?.label || oldStatus}" to "${STATUS_CONFIG[newStatus]?.label || newStatus}".`
      );
    }

    const now = new Date().toISOString();
    const historyEntry: StatusHistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from_status: oldStatus,
      to_status: newStatus,
      changed_at: now,
      actor,
      note: note || `Status transitioned from ${STATUS_CONFIG[oldStatus]?.label || oldStatus} to ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
    };

    const updatedApp: ApplicationItem = {
      ...currentApp,
      status: newStatus,
      updated_at: now,
      status_history: [...(currentApp.status_history || []), historyEntry],
    };

    list[index] = updatedApp;
    this.saveStorage(list);

    // If recruiter or system changed status, trigger candidate notification
    if (actor === 'recruiter' || actor === 'system') {
      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
      await notificationService.createNotification({
        type: 'application_status',
        title: `Application Update: ${currentApp.company}`,
        message: `Your application for ${currentApp.title} has progressed to ${statusLabel}.${note ? ` Note: "${note}"` : ''}`,
        priority: newStatus === 'offer_extended' ? 'urgent' : 'high',
        job_id: currentApp.job_id,
        application_id: currentApp.id,
        deep_link: `/applications?id=${currentApp.id}`,
        read: false,
        created_at: now,
      });
    }

    if (!API_CONFIG.USE_MOCK) {
      try {
        const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.APPLICATIONS.STATUS(currentApp.id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: newStatus, note, actor }),
        });
      } catch (err) {
        console.warn('Backend status update failed, local state preserved:', err);
      }
    }

    return updatedApp;
  }

  /**
   * Withdraw an application
   */
  async withdrawApplication(id: string, reason?: string): Promise<ApplicationItem> {
    return this.updateStatus(
      id,
      'withdrawn',
      reason ? `Withdrawn by candidate: ${reason}` : 'Withdrawn by candidate.',
      'candidate',
      true
    );
  }

  /**
   * Reset to default seed applications
   */
  resetStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_APPLICATIONS));
  }
}

export const applicationService = new ApplicationService();
