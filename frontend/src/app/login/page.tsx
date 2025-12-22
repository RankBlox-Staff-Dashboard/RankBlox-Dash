'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { verificationAPI } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isVerified, checkVerification, refreshUser } = useAuth();
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [emojiCode, setEmojiCode] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [robloxUsername, setRobloxUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth errors
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    
    if (errorParam) {
      let errorMessage = 'Login failed';
      
      switch (errorParam) {
        case 'no_code':
          errorMessage = 'No authorization code received from Discord';
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
          errorMessage = messageParam || 'An error occurred during login';
      }
      
      setError(errorMessage);
    }

    // If user is logged in and verified, redirect to dashboard
    if (user && isVerified) {
      router.replace('/');
      return;
    }

    // If user is logged in but not verified, show verification step
    if (user && !isVerified && user.status === 'pending_verification') {
      setStep('verify');
    }
  }, [user, isVerified, router, searchParams]);

  const handleDiscordLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://staffapp-9q1t.onrender.com/api';
    const oauthUrl = `${apiUrl}/auth/discord`;
    window.location.href = oauthUrl;
  };

  const handleRequestCode = async () => {
    try {
      setCodeLoading(true);
      setError(null);
      const response = await verificationAPI.requestCode();
      setEmojiCode(response.data.emoji_code);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to generate verification code';
      setError(errorMsg);
      // If unauthorized, refresh user state
      if (err.response?.status === 401) {
        await refreshUser();
      }
    } finally {
      setCodeLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!robloxUsername || !emojiCode) {
      setError('Please enter your Roblox username and get a verification code');
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      await verificationAPI.verify(robloxUsername, emojiCode);
      // Refresh user data to get updated status
      await refreshUser();
      await checkVerification();
      router.push('/');
    } catch (err: any) {
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
        <div className="bg-white rounded-lg p-12 max-w-md w-full shadow-xl">
          <h1 className="text-4xl font-bold text-black mb-3 text-center">
            Panora Connect Employees
          </h1>
          <p className="text-gray-600 mb-8 text-center text-lg">
            Authorized employees only — manage internal operations.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <button
            onClick={handleDiscordLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            Authorize Securely
          </button>

          <div className="mt-8 text-center space-y-2">
            <p className="text-sm font-medium text-gray-700">Secure authentication</p>
            <p className="text-xs text-gray-500">
              Authentication is handled securely by a verified provider. Your credentials remain private and are never stored.
            </p>
          </div>

          <p className="text-xs text-gray-400 text-center mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-12 max-w-md w-full shadow-xl">
        <h1 className="text-4xl font-bold text-black mb-3 text-center">
          Roblox Verification
        </h1>
        <p className="text-gray-600 mb-8 text-center text-lg">
          Verify your Roblox account to continue
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roblox Username
            </label>
            <input
              type="text"
              value={robloxUsername}
              onChange={(e) => setRobloxUsername(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Roblox username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            {!emojiCode ? (
              <button
                onClick={handleRequestCode}
                disabled={codeLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {codeLoading ? 'Generating...' : 'Get Verification Code'}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-4 text-center">
                  <p className="text-3xl mb-2">{emojiCode}</p>
                  <p className="text-sm text-gray-600">
                    Place this code in your Roblox bio or status
                  </p>
                </div>
                <button
                  onClick={handleRequestCode}
                  className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Generate New Code
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying || !emojiCode || !robloxUsername}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 text-lg"
          >
            {verifying ? 'Verifying...' : 'Verify Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

