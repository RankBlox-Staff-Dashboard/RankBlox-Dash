 'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.status !== 'active') {
      router.replace('/login');
      return;
    }

    router.replace('/overview');
  }, [loading, router, user]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">{loading ? 'Loading...' : 'Redirecting...'}</div>
    </div>
  );
}

