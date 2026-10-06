import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { JobProvider } from './context/JobContext';
import { ResumeProvider } from './context/ResumeContext';
import { RecruiterProvider } from './context/RecruiterContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <JobProvider>
                <ResumeProvider>
                  <RecruiterProvider>
                    <AppLayout />
                  </RecruiterProvider>
                </ResumeProvider>
              </JobProvider>
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
