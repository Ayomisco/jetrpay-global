'use client';

import { useState } from 'react';
import { useWallets, useTransactions } from '@/lib/queries';
import TransactionRow from '@/components/shared/TransactionRow';
import Card from '@/components/ui/Card';

const FILTERS = ['All', 'Sent', 'Received', 'Pending'];

export default function HistoryPage() {
  const { data: wallets } = useWallets();
  const [selectedWalletIdx, setSelectedWalletIdx] = useState(0);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);

  const wallet = wallets?.[selectedWalletIdx];
  const { data, isLoading } = useTransactions(wallet?.id || '', { page, pageSize: 20 });
  const rawTxs: any[] = data?.data || [];

  const filtered = rawTxs.filter((tx) => {
    if (filter === 'All') return true;
    if (filter === 'Sent') return ['P2P_SEND', 'BANK_TRANSFER_SEND'].includes(tx.type);
    if (filter === 'Received') return ['P2P_RECEIVE', 'BANK_TRANSFER_RECEIVE', 'DEPOSIT'].includes(tx.type);
    if (filter === 'Pending') return tx.status === 'PENDING' || tx.status === 'PROCESSING';
    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Transaction History</h1>
        <p className="text-white/50 text-sm">All your transfers and activity</p>
      </div>

      {/* Wallet tabs */}
      {wallets && wallets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {wallets.map((w: any, i: number) => (
            <button
              key={w.id}
              onClick={() => { setSelectedWalletIdx(i); setPage(1); }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                i === selectedWalletIdx
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'glass text-white/50 hover:text-white'
              }`}
            >
              {w.currency}
            </button>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
              filter === f
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                : 'border-white/10 text-white/40 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <Card>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-2.5 w-20" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-white/40 text-sm">No transactions found</p>
          </div>
        ) : (
          <>
            {filtered.map((tx: any) => <TransactionRow key={tx.id} tx={tx} />)}

            {/* Pagination */}
            <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex-1 py-2 rounded-xl text-sm text-white/50 hover:text-white disabled:opacity-30 glass"
              >
                ← Previous
              </button>
              <span className="flex items-center px-4 text-sm text-white/30">Page {page}</span>
              <button
                disabled={filtered.length < 20}
                onClick={() => setPage((p) => p + 1)}
                className="flex-1 py-2 rounded-xl text-sm text-white/50 hover:text-white disabled:opacity-30 glass"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
