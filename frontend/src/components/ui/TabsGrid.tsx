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
  className,
}: {
  items: TabsGridItem[];
  activeKey: string;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            className={cn(
              'flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[14px] font-semibold tracking-tight transition',
              isActive
                ? 'bg-white text-black shadow-[0_16px_35px_rgba(0,0,0,0.55)]'
                : 'text-white/70 hover:bg-white/6 hover:text-white/85'
            )}
          >
            <Icon className="h-[16px] w-[16px]" strokeWidth={2} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

