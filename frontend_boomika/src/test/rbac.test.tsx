import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App';
import { API_CONFIG } from '../config/api';
import { User } from '../types';

describe('Role-Based Access Control (RBAC) & Route Protection', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('swipex_onboarded', 'true'); // bypass onboarding modal in tests
  });

  it('unauthenticated users are blocked by auth guard and redirected to LoginScreen', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Access Workspace')).toBeInTheDocument();
      expect(screen.getByText(/Enter your credentials to continue/i)).toBeInTheDocument();
      // Ensure candidate-protected features are not visible
      expect(screen.queryByText(/Resume Versions & ATS Manager/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ATS Match Score & Gap Matrix/i)).not.toBeInTheDocument();
    });
  });

  it('Job Seeker (candidate role) has access to Resume Versions and ATS Score features', async () => {
    const candidateUser: User = {
      user_id: 'usr_candidate_1',
      name: 'Alex Mercer',
      email: 'alex.mercer@example.com',
      role: 'candidate',
      tier: 'Candidate Tier 1'
    };

    localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, 'mock_jwt_token_candidate');
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(candidateUser));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SwipeX')).toBeInTheDocument();
      expect(screen.getByText('ATS Score')).toBeInTheDocument();
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });

    // Navigate to Resume tab
    const resumeTab = screen.getByRole('button', { name: 'Resume' });
    fireEvent.click(resumeTab);

    await waitFor(() => {
      expect(screen.getByText(/Resume Versions & ATS Manager/i)).toBeInTheDocument();
      expect(screen.getByText(/Drag & Drop your resume here/i)).toBeInTheDocument();
    }, { timeout: 4000 });

    // Navigate to ATS Score Matrix tab
    const atsTab = screen.getByRole('button', { name: 'ATS Score' });
    fireEvent.click(atsTab);

    await waitFor(() => {
      expect(screen.getByText(/ATS Match Score & Gap Matrix/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('Recruiter role is restricted from candidate resume management and ATS score dashboard', async () => {
    const recruiterUser: User = {
      user_id: 'usr_recruiter_1',
      name: 'Sarah Connor',
      email: 'sarah.connor@acme.corp',
      role: 'recruiter',
      tier: 'Enterprise Talent'
    };

    localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, 'mock_jwt_token_recruiter');
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(recruiterUser));

    render(<App />);

    await waitFor(() => {
      // Recruiter Banner and Dashboard navigation should be displayed
      expect(screen.getByText(/RECRUITER\s+VIEW/i)).toBeInTheDocument();
      expect(screen.getAllByText('Post a Job').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Candidates/i).length).toBeGreaterThan(0);

      // Candidate-only tabs must NOT be present in navigation
      expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'ATS Score' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Resume Versions & ATS Manager/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ATS Match Score & Gap Matrix/i)).not.toBeInTheDocument();
    });
  });
});
