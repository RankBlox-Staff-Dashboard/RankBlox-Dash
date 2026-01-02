'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl, verificationAPI } from '@/services/api';

export default function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, verification, isFullyVerified, refreshUser, updateToken } = useAuth();
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [emojiCode, setEmojiCode] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [robloxUsername, setRobloxUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Login] useEffect triggered:', {
      loading,
      hasUser: !!user,
      hasVerification: !!verification,
      isFullyVerified,
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'server',
    });
    
    // Check for OAuth errors
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    
    if (errorParam) {
      console.error('[Login] OAuth error detected:', {
        error: errorParam,
        message: messageParam,
      });
      let errorMessage = 'Login failed';
      
      switch (errorParam) {
        case 'no_code':
          errorMessage = 'No authorization code received from Discord';
          break;
        case 'invalid_state':
          errorMessage = 'Security validation failed. Please try logging in again.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to authenticate with Discord. Please try again.';
          break;
        case 'user_fetch_failed':
          errorMessage = 'Failed to fetch user information from Discord';
          break;
        case 'server_error':
          errorMessage = messageParam || 'Server error occurred during login';
          break;
        case 'oauth_error':
          errorMessage = messageParam || 'Discord OAuth error occurred';
          break;
        case 'no_token':
          errorMessage = 'No authentication token received';
          break;
        default:
          errorMessage = messageParam || `An error occurred during login (${errorParam})`;
      }
      
      console.log('[Login] Setting error message:', errorMessage);
      setError(errorMessage);
    }

    // Use backend-computed verification status (single source of truth)
    if (!loading && user && verification) {
      console.log('[Login] User and verification loaded:', {
        userId: user.id,
        verification,
        isFullyVerified,
      });
      
      if (isFullyVerified) {
        // Fully verified - go to dashboard
        console.log('[Login] User fully verified, redirecting to /overview');
        router.replace('/overview');
        return;
      }
      
      // Check what verification step is needed
      if (verification.next_step === 'roblox') {
        console.log('[Login] Roblox verification needed, showing verify step');
        // Discord done, need Roblox verification
        setStep('verify');
      } else if (verification.discord && !verification.complete) {
        console.log('[Login] Discord verified but incomplete, showing verify step');
        // Discord done but something else is blocking - show verify step
        setStep('verify');
      }
    }
  }, [user, loading, verification, isFullyVerified, router, searchParams]);

  const handleDiscordLogin = () => {
    // Prefer explicit backend URL (static hosting) but still support local `/api` rewrite.
    const authUrl = `${getApiBaseUrl()}/auth/discord`;
    console.log('[Login] Initiating Discord OAuth, redirecting to:', authUrl);
    window.location.href = authUrl;
  };

  const handleRequestCode = async () => {
    try {
      console.log('[Login] Requesting verification code...');
      setCodeLoading(true);
      setError(null);
      const response = await verificationAPI.requestCode();
      console.log('[Login] Verification code received:', response.data.emoji_code);
      setEmojiCode(response.data.emoji_code);
    } catch (err: any) {
      console.error('[Login] Error requesting verification code:', err);
      console.error('[Login] Error details:', {
        status: err.response?.status,
        message: err.message,
        responseData: err.response?.data,
      });
      const errorMsg = err.response?.data?.error || 'Failed to generate verification code';
      setError(errorMsg);
      // If unauthorized, refresh user state
      if (err.response?.status === 401) {
        console.log('[Login] 401 error, refreshing user state');
        await refreshUser();
      }
    } finally {
      setCodeLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!robloxUsername || !emojiCode) {
      console.warn('[Login] Verification attempted without username or code');
      setError('Please enter your Roblox username and get a verification code');
      return;
    }

    try {
      console.log('[Login] Verifying Roblox account:', {
        robloxUsername,
        emojiCodeLength: emojiCode.length,
      });
      setVerifying(true);
      setError(null);
      
      const response = await verificationAPI.verify(robloxUsername, emojiCode);
      console.log('[Login] Verification response:', {
        message: response.data.message,
        hasToken: !!response.data.token,
        roblox_username: response.data.roblox_username,
        rank: response.data.rank,
      });
      
      // If backend returns a new token (with updated rank), save it
      if (response.data.token) {
        console.log('[Login] New token received, updating...');
        updateToken(response.data.token);
      }
      
      // Refresh user data to get updated status from backend
      console.log('[Login] Refreshing user data after verification...');
      const updatedUser = await refreshUser();
      console.log('[Login] Updated user:', {
        id: updatedUser?.id,
        verificationComplete: updatedUser?.verification?.complete,
        nextStep: updatedUser?.verification?.next_step,
      });
      
      // Check if verification is now complete
      if (updatedUser?.verification?.complete) {
        console.log('[Login] Verification complete, redirecting to /overview');
        router.push('/overview');
      } else {
        console.warn('[Login] Verification incomplete:', updatedUser?.verification);
        // Something else still needs verification
        setError('Verification incomplete. Please contact support.');
      }
    } catch (err: any) {
      console.error('[Login] Verification error:', err);
      console.error('[Login] Verification error details:', {
        status: err.response?.status,
        message: err.message,
        responseData: err.response?.data,
      });
      const errorMsg = err.response?.data?.error || 'Verification failed. Make sure the emoji code is in your Roblox bio/status.';
      setError(errorMsg);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-2xl p-10 max-w-md w-full shadow-2xl border border-white/10 animate-scaleIn">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            RankBlox
          </h1>
          <p className="text-white/60 mb-8 text-center">
            Staff Management Portal
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 animate-fadeIn">
              {error}
            </div>
          )}

          <button
            onClick={handleDiscordLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-lg flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Login with Discord
          </button>

          <div className="mt-8 text-center space-y-2">
            <p className="text-sm font-medium text-white/70">Secure authentication</p>
            <p className="text-xs text-white/50">
              Authentication is handled securely via Discord OAuth2. Your credentials remain private.
            </p>
          </div>

          <p className="text-xs text-white/30 text-center mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl p-10 max-w-md w-full shadow-2xl border border-white/10 animate-scaleIn">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Roblox Verification
        </h1>
        <p className="text-white/60 mb-8 text-center">
          Verify your Roblox account to continue
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 animate-fadeIn">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Roblox Username
            </label>
            <input
              type="text"
              value={robloxUsername}
              onChange={(e) => setRobloxUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition"
              placeholder="Enter your Roblox username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Verification Code
            </label>
            {!emojiCode ? (
              <button
                onClick={handleRequestCode}
                disabled={codeLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {codeLoading ? 'Generating...' : 'Get Verification Code'}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center">
                  <p className="text-3xl mb-2">{emojiCode}</p>
                  <p className="text-sm text-white/60">
                    Place this code in your Roblox bio
                  </p>
                </div>
                <button
                  onClick={handleRequestCode}
                  className="w-full text-blue-400 hover:text-blue-300 text-sm font-medium transition"
                >
                  Generate New Code
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying || !emojiCode || !robloxUsername}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-lg"
          >
            {verifying ? 'Verifying...' : 'Verify Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

