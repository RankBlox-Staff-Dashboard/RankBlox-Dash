'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function getTokenFromLocation(): string | null {
  if (typeof window === 'undefined') return null;

  // Prefer fragment token to avoid referrer / server log leakage
  const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash || '');
  const hashToken = hashParams.get('token');
  if (hashToken) return hashToken;

  // Backward compatibility for older backend deployments
  const url = new URL(window.location.href);
  return url.searchParams.get('token');
}

export default function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = getTokenFromLocation();
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (error) {
      // Redirect to login with error
      const errorParams = new URLSearchParams({ error });
      if (message) {
        errorParams.set('message', message);
      }
      router.replace(`/login?${errorParams.toString()}`);
      return;
    }

    if (token) {
      // Store token
      localStorage.setItem('token', token);

      // Remove token from URL (both query and fragment) after capture
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/auth/callback');
      }
      
      // Refresh user data and redirect
      refreshUser()
        .then(() => {
          // Small delay to ensure state updates
          setTimeout(() => {
            router.replace('/');
          }, 100);
        })
        .catch((err) => {
          console.error('Error refreshing user after login:', err);
          // Still redirect to home, AuthContext will handle loading state
          router.replace('/');
        });
    } else {
      // No token, redirect to login
      router.replace('/login?error=no_token');
    }
  }, [searchParams, router, refreshUser]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Completing login...</div>
    </div>
  );
}

