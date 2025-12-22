'use client';

import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-3">
        <div className="text-gray-300">
          <span className="text-gray-400">Signed in as:</span> {user?.discord_username}
        </div>
        <div className="text-gray-300">
          <span className="text-gray-400">Status:</span> {user?.status}
        </div>

        <button
          onClick={async () => {
            try {
              await authAPI.logout();
            } catch {
              // best-effort
            } finally {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }
            }
          }}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

