import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AuthPage() {
  return (
    <div className="min-h-[100svh] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_55%),linear-gradient(to_bottom,#000,#050505_45%,#000)] px-4">
      <div className="mx-auto flex min-h-[100svh] max-w-[420px] items-center">
        <Card className="w-full px-7 py-8">
          <div className="mx-auto flex max-w-[330px] flex-col items-center text-center">
            <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-white">
              Panora Connect Employees
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-white/55">
              Authorized employees only — manage internal operations.
            </p>

            <div className="mt-7 w-full">
              <Button href="/login" className="rounded-xl">
                Authorize Securely
              </Button>
            </div>

            <div className="mt-8 w-full">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <div className="text-[12px] font-semibold text-white/60">
                  Secure authentication
                </div>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-white/45">
                Authentication is handled securely by a verified provider. Your credentials
                remain private and are never stored.
              </p>
            </div>

            <p className="mt-8 text-[12px] text-white/45">
              By continuing, you agree to our{' '}
              <a href="#" className="text-white/85 underline underline-offset-4">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-white/85 underline underline-offset-4">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

