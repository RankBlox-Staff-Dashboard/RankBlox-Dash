import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (error) {
      // Redirect to login with error
      const errorParams = new URLSearchParams({ error });
      if (message) {
        errorParams.set('message', message);
      }
      navigate(`/login?${errorParams.toString()}`, { replace: true });
      return;
    }

    if (token) {
      // Store token
      localStorage.setItem('token', token);
      
      // Refresh user data and redirect
      refreshUser()
        .then(() => {
          // Small delay to ensure state updates
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 100);
        })
        .catch((err) => {
          console.error('Error refreshing user after login:', err);
          // Still redirect to home, AuthContext will handle loading state
          navigate('/', { replace: true });
        });
    } else {
      // No token, redirect to login
      navigate('/login?error=no_token', { replace: true });
    }
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-white text-xl">Completing login...</div>
    </div>
  );
}
