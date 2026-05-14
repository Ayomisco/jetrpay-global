'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useWallets } from '@/lib/queries';
import { formatCurrency, getInitials } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { data: wallets } = useWallets();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const kycColors: Record<string, string> = {
    APPROVED:    'text-emerald-400',
    PENDING:     'text-yellow-400',
    REJECTED:    'text-rose-400',
    NOT_STARTED: 'text-white/40',
  };

  const settings = [
    { label: 'Notification preferences', icon: '🔔', action: () => {} },
    { label: 'Security settings', icon: '🔐', action: () => {} },
    { label: 'Linked accounts', icon: '🔗', action: () => {} },
    { label: 'Help & support', icon: '💬', action: () => window.open('mailto:support@jetrpay.io') },
    { label: 'Privacy policy', icon: '📄', action: () => {} },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center pt-2 pb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-3xl font-bold text-white mb-3">
          {getInitials([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'U')}
        </div>
        <h1 className="text-xl font-bold text-white">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your Account'}</h1>
        <p className="text-white/40 text-sm mt-0.5">{user?.email}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-white/30">KYC:</span>
          <span className={`text-xs font-medium ${kycColors[user?.kycStatus || 'NOT_STARTED']}`}>
            {user?.kycStatus || 'NOT STARTED'}
          </span>
        </div>
      </div>

      {/* Wallet summary */}
      {wallets && wallets.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">My Wallets</h2>
          <div className="flex flex-col gap-3">
            {wallets.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400">
                    {w.currency}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{w.accountName || w.currency + ' Wallet'}</p>
                    <p className="text-xs text-white/30">{w.status || 'Active'}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-white">
                  {formatCurrency((w.balance || 0) / 100, w.currency)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Account info */}
      <Card>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">Account Details</h2>
        <div className="flex flex-col gap-3">
          {[
            ['Email', user?.email],
            ['Phone', user?.phone || '—'],
            ['Country', user?.country || '—'],
            ['Member since', user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <span className="text-white/40">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Settings */}
      <Card>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">Settings</h2>
        <div className="flex flex-col">
          {settings.map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex items-center gap-3 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/3 -mx-5 px-5 transition-colors text-left"
            >
              <span className="text-lg w-6">{icon}</span>
              <span className="flex-1 text-sm text-white">{label}</span>
              <span className="text-white/20 text-xs">›</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Logout */}
      <Button variant="danger" className="w-full py-3.5" onClick={handleLogout}>
        Sign out
      </Button>

      <p className="text-center text-xs text-white/20 pb-2">
        JetrPay v1.0.0 · Powered by Zynta Last-Mile Infrastructure
      </p>
    </div>
  );
}
