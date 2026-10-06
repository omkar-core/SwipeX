import { describe, it, expect, beforeEach } from 'vitest';
import { applicationService } from '../services/applicationService';
import { notificationService } from '../services/notificationService';
import { ApplicationStatus } from '../types/milestone4';

describe('ApplicationService Lifecycle & Notification Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    applicationService.resetStorage();
    notificationService.resetStorage();
  });

  it('retrieves default seed applications', async () => {
    const apps = await applicationService.getApplications();
    expect(apps.length).toBeGreaterThanOrEqual(4);
    expect(apps.some((a) => a.company === 'Stripe')).toBe(true);
    expect(apps.some((a) => a.status === 'interviewing')).toBe(true);
  });

  it('filters applications by status', async () => {
    const interviewing = await applicationService.getApplications({ status: 'interviewing' });
    expect(interviewing.every((a) => a.status === 'interviewing')).toBe(true);
  });

  it('filters applications by search query', async () => {
    const vercelApps = await applicationService.getApplications({ search: 'Vercel' });
    expect(vercelApps.length).toBe(1);
    expect(vercelApps[0].company).toBe('Vercel');
  });

  it('creates a new application with initial status applied and audit log', async () => {
    const newApp = await applicationService.createApplication(
      {
        id: 'job-test-99',
        title: 'Staff Platform Engineer',
        company: 'Cloudflare',
        location: 'Austin, TX',
        salary: '$180,000 - $220,000',
      },
      92,
      'Applied with tailored resume'
    );

    expect(newApp).toBeDefined();
    expect(newApp.status).toBe('applied');
    expect(newApp.match_score).toBe(92);
    expect(newApp.status_history.length).toBe(1);
    expect(newApp.status_history[0].to_status).toBe('applied');

    const fetched = await applicationService.getApplicationById(newApp.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.company).toBe('Cloudflare');
  });

  it('updates application status and appends to status history', async () => {
    const apps = await applicationService.getApplications();
    const target = apps[0];

    const updated = await applicationService.updateStatus(
      target.id,
      'offer_extended',
      'Final executive offer package delivered',
      'recruiter',
      true
    );

    expect(updated.status).toBe('offer_extended');
    expect(updated.status_history.length).toBe(target.status_history.length + 1);
    
    const lastHistory = updated.status_history[updated.status_history.length - 1];
    expect(lastHistory.to_status).toBe('offer_extended');
    expect(lastHistory.actor).toBe('recruiter');
    expect(lastHistory.note).toContain('Final executive offer');
  });

  it('triggers candidate notification when recruiter updates status', async () => {
    const apps = await applicationService.getApplications();
    const target = apps[0];

    await applicationService.updateStatus(
      target.id,
      'offer_extended',
      'Offer extended by hiring manager',
      'recruiter',
      true
    );

    const notifications = await notificationService.getNotifications();
    const statusNotif = notifications.find(
      (n) => n.type === 'application_status' && n.title.includes(target.company)
    );

    expect(statusNotif).toBeDefined();
    expect(statusNotif?.message).toContain('Offer Extended');
    expect(statusNotif?.priority).toBe('urgent');
  });

  it('allows candidate to withdraw application', async () => {
    const apps = await applicationService.getApplications();
    const target = apps[0];

    const withdrawn = await applicationService.withdrawApplication(
      target.id,
      'Accepted another offer'
    );

    expect(withdrawn.status).toBe('withdrawn');
    const lastHistory = withdrawn.status_history[withdrawn.status_history.length - 1];
    expect(lastHistory.note).toContain('Accepted another offer');
  });
});
