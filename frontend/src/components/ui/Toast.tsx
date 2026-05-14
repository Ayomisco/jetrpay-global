'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage { id: string; message: string; type: ToastType }

let toastQueue: ((msg: ToastMessage) => void) | null = null;

export function toast(message: string, type: ToastType = 'info') {
  toastQueue?.({ id: Date.now().toString(), message, type });
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastQueue = (msg) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== msg.id)), 4000);
    };
    return () => { toastQueue = null; };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'glass px-4 py-3 rounded-xl text-sm font-medium animate-slide-down shadow-glass',
            t.type === 'success' && 'border-emerald-500/30 text-emerald-300',
            t.type === 'error'   && 'border-rose-500/30 text-rose-300',
            t.type === 'info'    && 'border-orange-500/30 text-orange-300',
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
