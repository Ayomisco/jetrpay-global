'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { ToastProvider } from '@/components/ui/Toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    fetchMe().catch(() => router.replace('/auth/login'));
  }, [isAuthenticated, router, fetchMe]);

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-900 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[100px] pointer-events-none" />

      <Sidebar />

      <main className="lg:pl-64 pb-24 lg:pb-0 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      <BottomNav />
      <ToastProvider />
    </div>
  );
}
