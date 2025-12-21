import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, verificationAPI } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isVerified: boolean;
  refreshUser: () => Promise<void>;
  checkVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await authAPI.getMe();
      setUser(response.data);
      setIsVerified(response.data.status === 'active' && response.data.roblox_id !== null);
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    try {
      const response = await verificationAPI.getStatus();
      setIsVerified(response.data.verified);
      if (response.data.verified) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error checking verification:', error);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isVerified, refreshUser, checkVerification }}>
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

