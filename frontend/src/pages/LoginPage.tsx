import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verificationAPI } from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      // Clear error from URL
      navigate('/login', { replace: true });
    }

    // If user is logged in and verified, redirect to dashboard
    if (user && isVerified) {
      navigate('/', { replace: true });
      return;
    }

    // If user is logged in but not verified, show verification step
    if (user && !isVerified && user.status === 'pending_verification') {
      setStep('verify');
    }
  }, [user, isVerified, navigate, searchParams]);

  const handleDiscordLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    // Ensure we have a full URL for the redirect
    const oauthUrl = apiUrl.startsWith('http') 
      ? `${apiUrl}/auth/discord`
      : `${window.location.origin}${apiUrl}/auth/discord`;
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
      navigate('/');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Verification failed. Make sure the emoji code is in your Roblox bio/status.';
      setError(errorMsg);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-card rounded-lg p-8 border border-dark-border max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-2">AHS Staff Dashboard</h1>
          <p className="text-gray-400 mb-8">Sign in to access your staff dashboard</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleDiscordLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center space-x-2"
          >
            <span>🔵</span>
            <span>Login with Discord</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="bg-dark-card rounded-lg p-8 border border-dark-border max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-2">Roblox Verification</h1>
        <p className="text-gray-400 mb-8">Verify your Roblox account to continue</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Roblox Username
            </label>
            <input
              type="text"
              value={robloxUsername}
              onChange={(e) => setRobloxUsername(e.target.value)}
              className="w-full bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Roblox username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Verification Code
            </label>
            {!emojiCode ? (
              <button
                onClick={handleRequestCode}
                disabled={codeLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
              >
                {codeLoading ? 'Generating...' : 'Get Verification Code'}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-dark-border border border-dark-border rounded-lg px-4 py-3 text-center">
                  <p className="text-2xl mb-2">{emojiCode}</p>
                  <p className="text-sm text-gray-400">
                    Place this code in your Roblox bio or status
                  </p>
                </div>
                <button
                  onClick={handleRequestCode}
                  className="w-full text-blue-400 hover:text-blue-300 text-sm"
                >
                  Generate New Code
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying || !emojiCode || !robloxUsername}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
