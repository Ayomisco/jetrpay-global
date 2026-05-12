'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Forward to monitoring (Sentry etc.) here
    console.error('[JetrPay]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="glass p-8 max-w-sm w-full text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-3xl mx-auto mb-4">
          ⚠
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-white/50 text-sm mb-6">
          {process.env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred. Please try again or contact support.'}
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => { window.location.href = '/dashboard'; }}>
            Go home
          </Button>
          <Button className="flex-1" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
