'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, Search, AlertTriangle, Settings, User, HelpCircle, FileText, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';
import { RobloxAvatar } from './RobloxAvatar';

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutDashboard },
  { name: 'Lookup', path: '/tickets', icon: Search },
  { name: 'Infractions', path: '/infractions', icon: AlertTriangle },
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
    if (user.rank >= 24 && user.rank <= 255) return 'bg-red-600';
    if (user.rank >= 8) return 'bg-purple-600';
    return 'bg-green-600';
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 animate-slideDown">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {menuOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-lg font-bold text-white">Atlanta High</span>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRankColor()} text-white transition-all hover:scale-105`}>
          {getRankLabel()}
        </span>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-sm animate-fadeIn">
          <div className="pt-4 px-4">
            {/* Close Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            {/* Menu Header */}
            <div className="flex items-center gap-2 mb-6 px-2">
              <Shield className="w-6 h-6 text-blue-400" />
              <span className="text-xl font-bold text-white">Staff Dashboard</span>
            </div>

            {/* User Card */}
            {user && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 animate-slideUp">
                <div className="flex items-center gap-3">
                  <RobloxAvatar
                    robloxId={user.roblox_id}
                    discordId={user.discord_id}
                    discordAvatar={user.discord_avatar}
                    alt={user.roblox_username || user.discord_username}
                    size={48}
                    className="w-12 h-12 ring-2 ring-white/20"
                  />
                  <div>
                    <div className="text-white font-semibold">{user.roblox_username || user.discord_username}</div>
                    <div className="text-white/50 text-sm">{user.rank_name || 'Staff'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="space-y-2">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all animate-slideUp"
                style={{ animationDelay: '0.05s' }}
              >
                <User className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium">Account</span>
              </Link>
              <a
                href="https://discord.gg/firealarm"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all animate-slideUp"
                style={{ animationDelay: '0.1s' }}
              >
                <HelpCircle className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium">Support</span>
              </a>
              <a
                href="https://docs.ahscampus.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all animate-slideUp"
                style={{ animationDelay: '0.15s' }}
              >
                <FileText className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium">Documentation</span>
              </a>
            </nav>

            {/* Logout Button */}
            <div className="absolute bottom-8 left-4 right-4">
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all animate-slideUp"
              >
                <LogOut className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
