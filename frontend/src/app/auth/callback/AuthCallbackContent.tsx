'use client';

import { useEffect, useRef } from 'react';
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
  const { refreshUser, updateToken } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    // Prevent double-processing in React strict mode
    if (processed.current) return;
    processed.current = true;

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
      // Store token using context method
      updateToken(token);

      // Remove token from URL (both query and fragment) after capture
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/auth/callback');
      }
      
      // Refresh user data and redirect based on BACKEND verification status
      refreshUser()
        .then((userData) => {
          if (!userData) {
            // Something went wrong fetching user
            router.replace('/login?error=user_fetch_failed');
            return;
          }

          // Use backend-computed verification status (single source of truth)
          const verification = userData.verification;
          
          if (verification?.complete) {
            // Fully verified - go to dashboard
            router.replace('/overview');
          } else {
            // Need to complete verification - go to login page
            // Login page will show verification step
            router.replace('/login');
          }
        })
        .catch((err) => {
          console.error('Error refreshing user after login:', err);
          router.replace('/login?error=server_error');
        });
    } else {
      // No token, redirect to login
      router.replace('/login?error=no_token');
    }
  }, [searchParams, router, refreshUser, updateToken]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Completing login...</div>
    </div>
  );
}

