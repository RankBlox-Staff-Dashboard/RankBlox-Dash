'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { authAPI } from '@/services/api';
import { Shield, LayoutDashboard, Ticket, AlertTriangle, Settings, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutDashboard },
  { name: 'Tickets', path: '/tickets', icon: Ticket, permission: 'VIEW_TICKETS' },
  { name: 'Infractions', path: '/infractions', icon: AlertTriangle, permission: 'VIEW_INFRACTIONS' },
  { name: 'Management', path: '/management', icon: Shield, permission: 'MANAGE_USERS', adminOnly: true },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const isAdmin = user?.rank && user.rank >= 24 && user.rank <= 255;

  const visibleNav = navigation.filter((item) => {
    // Don't filter if still loading
    if (authLoading || permissionsLoading) return true;
    
    if (item.adminOnly && !isAdmin) return false;
    if (item.permission && !hasPermission(item.permission as any)) return false;
    return true;
  });

  return (
    <nav className="bg-zinc-900 border-r border-white/10 min-h-screen w-64 p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Shield className="w-6 h-6 text-blue-400" />
          <span>Atlanta High</span>
        </h1>
        {user && (
          <div className="mt-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isAdmin ? 'bg-red-600' : 'bg-blue-600'} text-white`}>
              {isAdmin ? 'Admin' : 'Staff'}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {visibleNav.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="mt-auto pt-8 border-t border-white/10">
          <button
            onClick={async () => {
              if (typeof window !== 'undefined') {
                try {
                  await authAPI.logout();
                } catch {
                  // best-effort
                } finally {
                  localStorage.removeItem('token');
                  window.location.href = '/login';
                }
              }
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
}
