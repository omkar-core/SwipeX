import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { ApiService } from '../services/api';
import { API_CONFIG } from '../config/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentRole: UserRole;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateUser: (updatedData: Partial<User>) => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // REQUIREMENT 1: Must start with unauthenticated state (false & null)
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check existing session token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
      if (token) {
        try {
          const res = await ApiService.getMe(token);
          setUser(res.user);
          setIsAuthenticated(true);
        } catch (err) {
          // Token expired or invalid
          localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN);
          localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authRes = await ApiService.login({ email, password });
      const meRes = await ApiService.getMe(authRes.access_token);
      setUser(meRes.user);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole = 'candidate') => {
    setIsLoading(true);
    try {
      await ApiService.register({ name, email, password, role });
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const authRes = await ApiService.oauthGoogle();
      const meRes = await ApiService.getMe(authRes.access_token);
      setUser(meRes.user);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('swipex:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('swipex:unauthorized', handleUnauthorized);
  }, [logout]);

  const switchRole = useCallback((newRole: UserRole) => {
    if (user) {
      const updatedUser: User = {
        ...user,
        role: newRole,
        title: newRole === 'recruiter' 
          ? 'Senior Technical Recruiter' 
          : newRole === 'admin' 
          ? 'Platform Administrator' 
          : 'Senior Product Designer',
      };
      setUser(updatedUser);
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  }, [user]);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const merged: User = {
        ...prev,
        ...updatedData,
        avatar: updatedData.avatar || updatedData.profile_picture_url || prev.avatar,
      };
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const currentRole: UserRole = user?.role || 'candidate';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        currentRole,
        login,
        register,
        loginWithGoogle,
        logout,
        switchRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
