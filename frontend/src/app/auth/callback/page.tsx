'use client';

import { Suspense } from 'react';
import AuthCallbackContent from './AuthCallbackContent';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
