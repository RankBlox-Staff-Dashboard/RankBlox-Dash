import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.78)]',
        className
      )}
    >
      {children}
    </div>
  );
}

