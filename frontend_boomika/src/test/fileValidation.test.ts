import { describe, it, expect } from 'vitest';
import { ResumeService } from '../services/resumeService';
import { ApiError } from '../config/api';

describe('Resume File Validation & Constraints', () => {
  it('accepts valid PDF file under 5 MB', async () => {
    const validPdfContent = new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' });
    const file = new File([validPdfContent], 'Alex_Mercer_Resume_2026.pdf', { type: 'application/pdf' });

    const result = await ResumeService.uploadResume(file, 'Frontend Specialist', false);
    expect(result).toBeDefined();
    expect(result.filename).toBe('Alex_Mercer_Resume_2026.pdf');
    expect(result.version).toBeGreaterThanOrEqual(1);
    expect(result.parse_status).toBe('parsed');
  });

  it('accepts valid DOCX file under 5 MB', async () => {
    const validDocxContent = new Blob(['mock docx content bytes'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const file = new File([validDocxContent], 'Alex_Mercer_Resume.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const result = await ResumeService.uploadResume(file, 'Fullstack Version', false);
    expect(result).toBeDefined();
    expect(result.filename).toBe('Alex_Mercer_Resume.docx');
    expect(result.parse_status).toBe('parsed');
  });

  it('rejects unsupported file formats with status 415', async () => {
    const pngContent = new Blob(['mock image bytes'], { type: 'image/png' });
    const file = new File([pngContent], 'photo_resume.png', { type: 'image/png' });

    await expect(ResumeService.uploadResume(file)).rejects.toThrowError(
      /Unsupported document format/i
    );

    try {
      await ResumeService.uploadResume(file);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(415);
    }
  });

  it('rejects files exceeding 5 MB limit with status 413', async () => {
    // 6 MB payload
    const oversizedBuffer = new Uint8Array(6 * 1024 * 1024);
    const file = new File([oversizedBuffer], 'Huge_Portfolio_Resume.pdf', { type: 'application/pdf' });

    await expect(ResumeService.uploadResume(file)).rejects.toThrowError(
      /exceeds the 5 MB limit/i
    );

    try {
      await ResumeService.uploadResume(file);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(413);
    }
  });
});
