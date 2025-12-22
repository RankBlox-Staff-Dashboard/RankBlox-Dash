'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TabsGridItem = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export function TabsGrid({
  items,
  activeKey,
  onTabChange,
  className,
}: {
  items: TabsGridItem[];
  activeKey: string;
  onTabChange?: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onTabChange?.(item.key)}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-white text-black shadow-lg'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
