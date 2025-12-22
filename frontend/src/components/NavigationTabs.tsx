'use client';

import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Search, 
  AlertTriangle, 
  Settings 
} from 'lucide-react';
import { Card } from './ui/Card';
import { cn } from '@/lib/cn';

const tabs = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/overview' },
  { key: 'lookup', label: 'Lookup', icon: Search, path: '/tickets' },
  { key: 'infractions', label: 'Infractions', icon: AlertTriangle, path: '/infractions' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export function NavigationTabs() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Card className="p-4 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab, index) => {
          const isActive = tab.path === pathname;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => router.push(tab.path)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 animate-slideUp',
                isActive
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'text-white/60 hover:bg-white/10 hover:text-white hover:scale-105'
              )}
              style={{ animationDelay: `${0.05 * index}s` }}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
