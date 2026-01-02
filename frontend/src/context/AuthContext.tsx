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
    console.log('[Auth] Logging out user');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      console.log('[Auth] Token removed from localStorage');
    }
    setUser(null);
    setVerification(null);
    console.log('[Auth] User state cleared');
  }, []);

  const updateToken = useCallback((token: string) => {
    console.log('[Auth] Updating token, length:', token.length);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      console.log('[Auth] Token saved to localStorage');
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      if (typeof window === 'undefined') {
        console.log('[Auth] refreshUser called on server, returning null');
        return null;
      }
      
      const token = localStorage.getItem('token');
      console.log('[Auth] refreshUser - token present:', !!token, 'token length:', token?.length || 0);
      
      if (!token) {
        console.log('[Auth] No token found, clearing user state');
        setUser(null);
        setVerification(null);
        setLoading(false);
        return null;
      }

      console.log('[Auth] Fetching user data from API...');
      const response = await authAPI.getMe();
      const userData = response.data;
      
      console.log('[Auth] User data received:', {
        id: userData.id,
        discord_username: userData.discord_username,
        roblox_username: userData.roblox_username,
        rank: userData.rank,
        status: userData.status,
        hasVerification: !!userData.verification,
      });
      
      setUser(userData);
      
      // Use backend-computed verification status - SINGLE SOURCE OF TRUTH
      // Do NOT compute verification locally
      if (userData.verification) {
        console.log('[Auth] Using backend verification status:', userData.verification);
        setVerification(userData.verification);
      } else {
        console.warn('[Auth] No verification status from backend, using fallback');
        // Fallback for old backend responses (backwards compatibility)
        const fallbackVerification = {
          discord: !!userData.discord_id,
          roblox: !!userData.roblox_id,
          active: userData.status === 'active',
          rank: userData.rank !== null,
          complete: userData.status === 'active' && userData.roblox_id !== null && userData.rank !== null,
          next_step: !userData.roblox_id ? 'roblox' : (userData.status !== 'active' ? 'activation' : null),
        };
        console.log('[Auth] Fallback verification:', fallbackVerification);
        setVerification(fallbackVerification);
      }
      
      return userData;
    } catch (error: any) {
      console.error('[Auth] Error fetching user:', error);
      console.error('[Auth] Error details:', {
        status: error.response?.status,
        message: error.message,
        responseData: error.response?.data,
      });
      
      // Only clear token on auth errors, not network errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('[Auth] Auth error detected, logging out');
        logout();
      }
      
      return null;
    } finally {
      setLoading(false);
      console.log('[Auth] refreshUser completed, loading set to false');
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
