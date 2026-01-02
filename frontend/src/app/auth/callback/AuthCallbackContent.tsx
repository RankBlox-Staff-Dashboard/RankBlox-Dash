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

  // Backward compatibility for older backend deployments - check query string
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
    if (processed.current) {
      console.log('[Auth Callback] Already processed, skipping');
      return;
    }
    processed.current = true;

    console.log('[Auth Callback] Processing OAuth callback...');
    const token = getTokenFromLocation();
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    console.log('[Auth Callback] Callback data:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      error,
      message,
      hash: typeof window !== 'undefined' ? window.location.hash : 'server',
      search: typeof window !== 'undefined' ? window.location.search : 'server',
    });

    if (error) {
      console.error('[Auth Callback] Error in callback:', { error, message });
      // Redirect to login with error
      const errorParams = new URLSearchParams({ error });
      if (message) {
        errorParams.set('message', message);
      }
      const redirectUrl = `/login?${errorParams.toString()}`;
      console.log('[Auth Callback] Redirecting to login with error:', redirectUrl);
      router.replace(redirectUrl);
      return;
    }

    if (token) {
      console.log('[Auth Callback] Token found, storing and refreshing user...');
      // Store token using context method
      updateToken(token);

      // Remove token from URL (both query and fragment) after capture
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/auth/callback');
        console.log('[Auth Callback] Token removed from URL');
      }
      
      // Refresh user data and redirect based on BACKEND verification status
      refreshUser()
        .then((userData) => {
          console.log('[Auth Callback] User refresh completed:', {
            hasUserData: !!userData,
            userId: userData?.id,
            verificationComplete: userData?.verification?.complete,
            nextStep: userData?.verification?.next_step,
          });
          
          if (!userData) {
            // Something went wrong fetching user
            console.error('[Auth Callback] No user data received, redirecting to login');
            router.replace('/login?error=user_fetch_failed');
            return;
          }

          // Use backend-computed verification status (single source of truth)
          const verification = userData.verification;
          
          if (verification?.complete) {
            // Fully verified - go to dashboard
            console.log('[Auth Callback] User fully verified, redirecting to /overview');
            router.replace('/overview');
          } else {
            // Need to complete verification - go to login page
            // Login page will show verification step
            console.log('[Auth Callback] Verification incomplete, redirecting to /login');
            router.replace('/login');
          }
        })
        .catch((err) => {
          console.error('[Auth Callback] Error refreshing user after login:', err);
          console.error('[Auth Callback] Error details:', {
            message: err.message,
            stack: err.stack,
          });
          router.replace('/login?error=server_error');
        });
    } else {
      // No token, redirect to login
      console.warn('[Auth Callback] No token found in callback URL');
      router.replace('/login?error=no_token');
    }
  }, [searchParams, router, refreshUser, updateToken]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Completing login...</div>
    </div>
  );
}

