import { cn } from '@/lib/cn';

type BadgeTone = 'neutral' | 'green' | 'blue' | 'yellow' | 'red' | 'purple';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-white/10 text-white/80 ring-1 ring-white/10',
  blue: 'bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/20',
  green: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25',
  yellow: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25',
  red: 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/25',
  purple: 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-3 py-1 text-[12px] font-semibold tracking-tight',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

