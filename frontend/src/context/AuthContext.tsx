'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authAPI, verificationAPI } from '../services/api';
import type { User, VerificationStatus } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // Use backend-computed verification status - single source of truth
  verification: VerificationStatus | null;
  // Convenience getter for fully verified state
  isFullyVerified: boolean;
  refreshUser: () => Promise<User | null>;
  updateToken: (token: string) => void;
  logout: () => void;
}

const DEFAULT_VERIFICATION: VerificationStatus = {
  discord: false,
  roblox: false,
  active: false,
  rank: false,
  complete: false,
  next_step: 'discord',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setUser(null);
    setVerification(null);
  }, []);

  const updateToken = useCallback((token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      if (typeof window === 'undefined') return null;
      
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setVerification(null);
        setLoading(false);
        return null;
      }

      const response = await authAPI.getMe();
      const userData = response.data;
      
      setUser(userData);
      
      // Use backend-computed verification status - SINGLE SOURCE OF TRUTH
      // Do NOT compute verification locally
      if (userData.verification) {
        setVerification(userData.verification);
      } else {
        // Fallback for old backend responses (backwards compatibility)
        setVerification({
          discord: !!userData.discord_id,
          roblox: !!userData.roblox_id,
          active: userData.status === 'active',
          rank: userData.rank !== null,
          complete: userData.status === 'active' && userData.roblox_id !== null && userData.rank !== null,
          next_step: !userData.roblox_id ? 'roblox' : (userData.status !== 'active' ? 'activation' : null),
        });
      }
      
      return userData;
    } catch (error: any) {
      console.error('Error fetching user:', error);
      
      // Only clear token on auth errors, not network errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Convenience computed value
  const isFullyVerified = verification?.complete ?? false;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      verification,
      isFullyVerified,
      refreshUser, 
      updateToken,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
