import { cn } from '@/lib/cn';
import { Shield } from 'lucide-react';

export function Avatar({
  className,
  status = 'shield',
}: {
  className?: string;
  status?: 'shield' | 'none';
}) {
  return (
    <div className={cn('relative h-[62px] w-[62px]', className)}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-rose-500/25 to-transparent blur-[10px]" />
      <div className="relative h-full w-full rounded-full bg-gradient-to-b from-white/12 to-white/5 p-[2px] shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
        <div className="h-full w-full overflow-hidden rounded-full bg-[radial-gradient(80%_80%_at_30%_30%,rgba(255,255,255,0.10),transparent_65%),linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="flex h-full w-full items-center justify-center text-[20px] font-semibold tracking-tight text-white/85">
            BG
          </div>
        </div>
      </div>

      {status === 'shield' ? (
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-400/30">
          <Shield className="h-[14px] w-[14px] text-rose-200" strokeWidth={2.2} />
        </div>
      ) : null}
    </div>
  );
}

