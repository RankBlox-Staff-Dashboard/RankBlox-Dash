'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, Search, AlertTriangle, TrendingUp, Wallet, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutDashboard },
  { name: 'Lookup', path: '/tickets', icon: Search },
  { name: 'Infractions', path: '/infractions', icon: AlertTriangle },
  { name: 'Analytics', path: '/analytics', icon: TrendingUp },
  { name: 'Payouts', path: '/payouts', icon: Wallet },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const getRankLabel = () => {
    if (!user?.rank_name) return 'Staff';
    return user.rank_name;
  };

  const getRankColor = () => {
    if (!user?.rank) return 'bg-blue-600';
    if (user.rank >= 16 && user.rank <= 255) return 'bg-red-600';
    if (user.rank >= 8) return 'bg-purple-600';
    return 'bg-green-600';
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            {menuOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔗</span>
            <span className="text-lg font-bold text-white">Panora Staff</span>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRankColor()} text-white`}>
          {getRankLabel()}
        </span>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-sm">
          <div className="pt-20 px-4">
            <nav className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                      isActive
                        ? 'bg-white text-black'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-8 pt-4 border-t border-white/10">
              <button
                onClick={async () => {
                  try {
                    await authAPI.logout();
                  } catch {
                    // best-effort
                  } finally {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
              >
                <span>🚪</span>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
