'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type StatTone = 'blue' | 'yellow' | 'green' | 'purple';

const tone: Record<
  StatTone,
  { iconWrap: string; iconRing: string; iconColor: string }
> = {
  blue: {
    iconWrap: 'bg-blue-500/14',
    iconRing: 'ring-1 ring-blue-400/20',
    iconColor: 'text-blue-200',
  },
  yellow: {
    iconWrap: 'bg-amber-500/14',
    iconRing: 'ring-1 ring-amber-400/25',
    iconColor: 'text-amber-200',
  },
  green: {
    iconWrap: 'bg-emerald-500/14',
    iconRing: 'ring-1 ring-emerald-400/25',
    iconColor: 'text-emerald-200',
  },
  purple: {
    iconWrap: 'bg-violet-500/14',
    iconRing: 'ring-1 ring-violet-400/25',
    iconColor: 'text-violet-200',
  },
};

export function StatItem({
  title,
  value,
  icon: Icon,
  tone: t,
  className,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone: StatTone;
  className?: string;
}) {
  const styles = tone[t];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-2xl',
          styles.iconWrap,
          styles.iconRing
        )}
      >
        <Icon className={cn('h-[18px] w-[18px]', styles.iconColor)} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-white/60">{title}</div>
        <div className="mt-0.5 text-[18px] font-semibold leading-none tracking-tight text-white">
          {value}
        </div>
      </div>
    </div>
  );
}

