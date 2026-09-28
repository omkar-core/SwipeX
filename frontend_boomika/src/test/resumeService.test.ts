import { describe, it, expect, beforeEach } from 'vitest';
import { ResumeService, INITIAL_MOCK_RESUME_VERSIONS } from '../services/resumeService';
import { API_CONFIG } from '../config/api';

describe('ResumeService CRUD & Version Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fetches initial mock resume versions when storage is uninitialized', async () => {
    const versions = await ResumeService.getResumeVersions();
    expect(versions).toHaveLength(INITIAL_MOCK_RESUME_VERSIONS.length);
    expect(versions[0].is_default).toBe(true);
  });

  it('uploads a new resume version, increments version number, and prepends to list', async () => {
    const initialVersions = await ResumeService.getResumeVersions();
    const highestVersion = Math.max(...initialVersions.map(v => v.version));

    const testFile = new File(['content'], 'Alex_Senior_Staff_2026.pdf', { type: 'application/pdf' });
    const created = await ResumeService.uploadResume(testFile, 'Staff Engineer Track', false);

    expect(created.version).toBe(highestVersion + 1);
    expect(created.version_label).toBe('Staff Engineer Track');
    expect(created.parse_status).toBe('parsed');

    const updatedList = await ResumeService.getResumeVersions();
    expect(updatedList[0].resume_id).toBe(created.resume_id);
    expect(updatedList.length).toBe(initialVersions.length + 1);
  });

  it('switches default resume correctly without duplicating default state', async () => {
    const versions = await ResumeService.getResumeVersions();
    expect(versions.length).toBeGreaterThanOrEqual(2);

    const nonDefault = versions.find(v => !v.is_default);
    expect(nonDefault).toBeDefined();

    if (nonDefault) {
      const updated = await ResumeService.setDefaultResume(nonDefault.resume_id);
      expect(updated.is_default).toBe(true);

      const refreshed = await ResumeService.getResumeVersions();
      const defaultCount = refreshed.filter(v => v.is_default).length;
      expect(defaultCount).toBe(1);
      expect(refreshed.find(v => v.resume_id === nonDefault.resume_id)?.is_default).toBe(true);
    }
  });

  it('deletes a resume version and reassigns default if deleted item was active', async () => {
    const versions = await ResumeService.getResumeVersions();
    const targetToDelete = versions[0];

    await ResumeService.deleteResumeVersion(targetToDelete.resume_id);

    const refreshed = await ResumeService.getResumeVersions();
    expect(refreshed.find(v => v.resume_id === targetToDelete.resume_id)).toBeUndefined();
    expect(refreshed.length).toBe(versions.length - 1);
    expect(refreshed.some(v => v.is_default)).toBe(true);
  });

  it('parses and updates skills for an existing resume', async () => {
    const versions = await ResumeService.getResumeVersions();
    const target = versions[0];

    const parsed = await ResumeService.parseResume(target.resume_id);
    expect(parsed.parse_status).toBe('parsed');
    expect(parsed.parsed_skills.length).toBeGreaterThan(0);
  });
});
