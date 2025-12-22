import Link from 'next/link';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-white to-white/90 text-black shadow-[0_18px_45px_rgba(0,0,0,0.55)] hover:from-white hover:to-white active:translate-y-px',
  ghost:
    'bg-white/10 text-white/85 ring-1 ring-white/10 hover:bg-white/12 hover:text-white',
};

export function Button({
  children,
  className,
  variant = 'primary',
  href,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  href?: string;
}) {
  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold tracking-tight transition active:scale-[0.99]';

  if (href) {
    return (
      <Link href={href} className={cn(base, variantClasses[variant], className)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cn(base, variantClasses[variant], className)} type="button">
      {children}
    </button>
  );
}

