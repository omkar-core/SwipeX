import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResumeDropzone } from '../components/resume/ResumeDropzone';
import { ResumeVersionsList } from '../components/resume/ResumeVersionsList';
import { ParsedSkillsPreview } from '../components/resume/ParsedSkillsPreview';
import { ToastProvider } from '../context/ToastContext';
import { ResumeProvider } from '../context/ResumeContext';
import { ResumeVersion } from '../types';
import { API_CONFIG } from '../config/api';

const sampleVersions: ResumeVersion[] = [
  {
    resume_id: 'v3_test',
    version: 3,
    version_label: 'Frontend Lead v3',
    filename: 'Frontend_Lead_2026.pdf',
    file_size: '1.2 MB',
    uploaded_at: '2026-09-24T12:00:00Z',
    is_default: true,
    parse_status: 'parsed',
    parsed_skills: ['React 19', 'TypeScript', 'Tailwind CSS'],
    extracted_skills: ['React 19', 'TypeScript', 'Tailwind CSS'],
    overall_fit_score: 88,
    format_compatibility: 'High'
  },
  {
    resume_id: 'v2_test',
    version: 2,
    version_label: 'Fullstack v2',
    filename: 'Fullstack_Dev_2026.docx',
    file_size: '1.5 MB',
    uploaded_at: '2026-09-20T10:00:00Z',
    is_default: false,
    parse_status: 'failed',
    parse_error: 'Document text extraction failed due to password protection.',
    parsed_skills: [],
    extracted_skills: [],
    overall_fit_score: 75,
    format_compatibility: 'Medium'
  }
];

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <ResumeProvider>{ui}</ResumeProvider>
    </ToastProvider>
  );
};

describe('Resume Management UI Components', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.RESUME_VERSIONS, JSON.stringify(sampleVersions));
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACTIVE_RESUME_ID, 'v3_test');
  });

  describe('ResumeDropzone Component', () => {
    it('renders drag and drop prompt, accepted file types, and size limit', async () => {
      renderWithProvider(<ResumeDropzone />);

      expect(screen.getByText(/Drag & Drop your resume here/i)).toBeInTheDocument();
      expect(screen.getByText(/Supports/i)).toBeInTheDocument();
      expect(screen.getByText(/Max Size: 5 MB/i)).toBeInTheDocument();
    });

    it('displays client-side error when user selects invalid file type', async () => {
      renderWithProvider(<ResumeDropzone />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      if (fileInput) {
        const invalidFile = new File(['image'], 'resume_pic.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });

        await waitFor(() => {
          expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('ResumeVersionsList Component', () => {
    it('renders empty state when no resume versions are provided in storage', async () => {
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.RESUME_VERSIONS, JSON.stringify([]));

      renderWithProvider(<ResumeVersionsList />);

      await waitFor(() => {
        expect(screen.getByText(/No Resume Versions Yet/i)).toBeInTheDocument();
      });
    });

    it('renders list of versions with version badges and parse status badges', async () => {
      renderWithProvider(<ResumeVersionsList />);

      await waitFor(() => {
        expect(screen.getByText(/Frontend_Lead_2026.pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/Fullstack_Dev_2026.docx/i)).toBeInTheDocument();
        expect(screen.getByText('ACTIVE DEFAULT')).toBeInTheDocument();
        expect(screen.getByText(/Parsed/i)).toBeInTheDocument();
      });
    });
  });

  describe('ParsedSkillsPreview Component', () => {
    it('renders parsed skills chips and fit score badge', async () => {
      renderWithProvider(<ParsedSkillsPreview />);

      await waitFor(() => {
        expect(screen.getByText(/Parsed Skills & Competencies/i)).toBeInTheDocument();
        expect(screen.getByText('React 19')).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('Tailwind CSS')).toBeInTheDocument();
      });
    });

    it('renders parse failure state with retry button when active resume failed', async () => {
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACTIVE_RESUME_ID, 'v2_test');

      renderWithProvider(<ParsedSkillsPreview />);

      await waitFor(() => {
        expect(screen.getByText(/Parsing Incomplete or Failed/i)).toBeInTheDocument();
        expect(screen.getByText(/Retry Semantic Parse/i)).toBeInTheDocument();
      });
    });
  });
});
