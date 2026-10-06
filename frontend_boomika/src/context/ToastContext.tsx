import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setToasts(prev => {
      if (prev.some(t => t.message === message)) {
        return prev;
      }
      const id = Math.random().toString(36).substring(2, 9);
      setTimeout(() => {
        removeToast(id);
      }, 3500);
      return [...prev, { id, message, type }];
    });
  }, [removeToast]);

  React.useEffect(() => {
    const handleForbidden = (e: any) => {
      const msg = e?.detail?.message || 'Permission Denied: You do not have permission to perform this action.';
      showToast(msg, 'warning');
    };
    window.addEventListener('swipex:forbidden', handleForbidden);
    return () => window.removeEventListener('swipex:forbidden', handleForbidden);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-blue-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            {toast.type === 'success' && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-slate-300 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
