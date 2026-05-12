'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallets, useTransactions } from '@/lib/queries';
import { useAuthStore } from '@/store/auth';
import { formatCurrency, formatAmount, getInitials } from '@/lib/utils';
import TransactionRow from '@/components/shared/TransactionRow';
import Card from '@/components/ui/Card';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: wallets, isLoading: loadingWallets } = useWallets();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedWallet = wallets?.[selectedIdx];
  const { data: txData } = useTransactions(selectedWallet?.id || '', { limit: 5 });
  const transactions = txData?.transactions || txData || [];

  const totalBalance = wallets?.reduce((sum: number, w: any) => {
    return sum + (w.balance || 0) / 100;
  }, 0) || 0;

  const quickActions = [
    { href: '/send',    label: 'Send',    icon: '↑', color: 'from-indigo-500 to-purple-600' },
    { href: '/receive', label: 'Receive', icon: '↓', color: 'from-emerald-500 to-teal-600' },
    { href: '/history', label: 'History', icon: '⧗', color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/50 text-sm">Good day,</p>
          <h1 className="text-xl font-bold text-white">{user?.fullName?.split(' ')[0] || 'Welcome'} 👋</h1>
        </div>
        <Link href="/profile">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
            {getInitials(user?.fullName || user?.email || 'U')}
          </div>
        </Link>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-3xl overflow-hidden p-6 bg-gradient-to-br from-indigo-600/30 to-purple-700/30 border border-white/10 shadow-glass">
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 backdrop-blur-sm" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 text-sm font-medium">Total Balance</span>
            {wallets && wallets.length > 1 && (
              <div className="flex gap-1">
                {wallets.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === selectedIdx ? 'bg-white w-4' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {loadingWallets ? (
            <div className="skeleton h-10 w-48 mb-2" />
          ) : (
            <div className="mb-1">
              <span className="text-4xl font-bold text-white tracking-tight">
                {selectedWallet
                  ? formatCurrency((selectedWallet.balance || 0) / 100, selectedWallet.currency)
                  : formatCurrency(totalBalance)}
              </span>
            </div>
          )}

          {selectedWallet && (
            <p className="text-white/40 text-xs">{selectedWallet.currency} wallet • {selectedWallet.accountName || 'Personal'}</p>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 mt-5">
            {quickActions.map(({ href, label, icon, color }) => (
              <Link key={href} href={href} className="flex-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xl shadow-lg`}>
                    {icon}
                  </div>
                  <span className="text-xs text-white/60 font-medium">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Wallets */}
      {wallets && wallets.length > 1 && (
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">My Wallets</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {wallets.map((w: any, i: number) => (
              <button
                key={w.id}
                onClick={() => setSelectedIdx(i)}
                className={`flex-shrink-0 glass px-4 py-3 rounded-2xl text-left transition-all ${i === selectedIdx ? 'border-indigo-500/50 bg-indigo-500/10' : ''}`}
              >
                <p className="text-xs text-white/50 mb-0.5">{w.currency}</p>
                <p className="text-base font-semibold text-white">
                  {formatAmount((w.balance || 0) / 100)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          <Link href="/history" className="text-xs text-indigo-400 hover:text-indigo-300">See all</Link>
        </div>

        {!selectedWallet ? (
          <p className="text-white/30 text-sm text-center py-6">No wallets yet. Contact support to get started.</p>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">💸</p>
            <p className="text-white/40 text-sm">No transactions yet</p>
            <Link href="/send" className="text-indigo-400 text-sm mt-1 inline-block hover:text-indigo-300">Make your first transfer →</Link>
          </div>
        ) : (
          <div>
            {transactions.map((tx: any) => <TransactionRow key={tx.id} tx={tx} />)}
          </div>
        )}
      </Card>
    </div>
  );
}
