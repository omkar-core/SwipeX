import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNavDrawer } from '../components/layout/MobileNavDrawer';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';

describe('Mobile Navigation Drawer & Production Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDrawer = (props: {
    isOpen: boolean;
    onClose: () => void;
    activeTab: any;
    onTabChange: (tab: any) => void;
  }) => {
    return render(
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <MobileNavDrawer {...props} />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    );
  };

  it('renders mobile drawer when isOpen is true with navigation links', () => {
    const handleClose = vi.fn();
    const handleTabChange = vi.fn();

    renderDrawer({
      isOpen: true,
      onClose: handleClose,
      activeTab: 'discover',
      onTabChange: handleTabChange,
    });

    expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();
    expect(screen.getByText('Discover Jobs')).toBeInTheDocument();
    expect(screen.getByText('Applications Tracking')).toBeInTheDocument();
  });

  it('closes mobile drawer when close button or backdrop is clicked', () => {
    const handleClose = vi.fn();
    const handleTabChange = vi.fn();

    renderDrawer({
      isOpen: true,
      onClose: handleClose,
      activeTab: 'discover',
      onTabChange: handleTabChange,
    });

    const closeBtn = screen.getByRole('button', { name: /Close menu/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByTestId('mobile-nav-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('closes mobile drawer when Escape key is pressed', () => {
    const handleClose = vi.fn();
    const handleTabChange = vi.fn();

    renderDrawer({
      isOpen: true,
      onClose: handleClose,
      activeTab: 'discover',
      onTabChange: handleTabChange,
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('ErrorBoundary renders friendly error fallback when child component throws', () => {
    const ProblemChild = () => {
      throw new Error('Test crash in child tree');
    };

    // Suppress console.error for expected test throw
    const originalConsoleError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Test crash in child tree/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();

    console.error = originalConsoleError;
  });
});
