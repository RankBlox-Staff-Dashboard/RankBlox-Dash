import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const navigation = [
  { name: 'Overview', path: '/', icon: '📊' },
  { name: 'Tickets', path: '/tickets', icon: '🎫', permission: 'VIEW_TICKETS' },
  { name: 'Infractions', path: '/infractions', icon: '⚠️', permission: 'VIEW_INFRACTIONS' },
  { name: 'Analytics', path: '/analytics', icon: '📈', permission: 'VIEW_ANALYTICS' },
  { name: 'Management', path: '/management', icon: '⚙️', permission: 'MANAGE_USERS', adminOnly: true },
  { name: 'Settings', path: '/settings', icon: '🔧' },
];

export function NavBar() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const isAdmin = user?.rank && user.rank >= 16 && user.rank <= 255;

  const visibleNav = navigation.filter((item) => {
    // Don't filter if still loading
    if (authLoading || permissionsLoading) return true;
    
    if (item.adminOnly && !isAdmin) return false;
    if (item.permission && !hasPermission(item.permission as any)) return false;
    return true;
  });

  return (
    <nav className="bg-dark-card border-r border-dark-border min-h-screen w-64 p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span>🔗</span>
          <span>AHS Staff</span>
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
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-dark-border hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

