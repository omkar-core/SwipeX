import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-screen bg-slate-50 dark:bg-[#0B132B] flex items-center justify-center p-4 font-sans"
          data-testid="error-boundary-fallback"
        >
          <div className="max-w-md w-full bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/40">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Something went wrong
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                An unexpected application error occurred. We've captured the diagnostics and your saved session data remains safe.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-xl text-left overflow-x-auto max-h-32 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold break-all">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Feed</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
