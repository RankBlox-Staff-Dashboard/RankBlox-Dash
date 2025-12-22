'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, verification, isFullyVerified, refreshUser } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth state to load
    if (loading) return;

    // No user at all - send to login
    if (!user) {
      router.replace('/login');
      return;
    }

    // Use backend-computed verification status (single source of truth)
    // User must be FULLY verified to access dashboard
    if (!isFullyVerified) {
      // Redirect to login where they can complete verification
      router.replace('/login');
      return;
    }

    // All checks passed - allow access
    setIsChecking(false);
  }, [user, loading, verification, isFullyVerified, router]);

  // Show loading while checking auth state
  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/60 text-lg">Loading...</div>
      </div>
    );
  }

  // Don't render dashboard if not verified (this is a safety check)
  if (!user || !isFullyVerified) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="px-4 py-4 pb-8 max-w-lg mx-auto page-transition">
        {children}
      </main>
      <footer className="py-6 text-center text-white/40 text-sm animate-fadeIn">
        © 2025 Atlanta High. All rights reserved.
      </footer>
    </div>
  );
}
