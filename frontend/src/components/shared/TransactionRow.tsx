import { formatCurrency, formatRelativeTime, getTransactionSign } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

interface Transaction {
  id: string;
  type: string;
  description?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  direction?: 'credit' | 'debit';
  metadata?: { recipientAccountNumber?: string; recipientBankCode?: string };
}

export default function TransactionRow({ tx }: { tx: Transaction }) {
  const sign = getTransactionSign(tx.type, tx.direction);
  const isCredit = sign === '+';

  const icons: Record<string, string> = {
    P2P_SEND: '↑', P2P_RECEIVE: '↓', BANK_TRANSFER_SEND: '🏦',
    BANK_TRANSFER_RECEIVE: '🏦', DEPOSIT: '↓', WITHDRAWAL: '↑', REVERSAL: '↩',
  };
  const icon = icons[tx.type] || (isCredit ? '↓' : '↑');

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-white/5 last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
        isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/12 text-orange-400'
      }`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {tx.description || tx.type?.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-white/40 mt-0.5">{formatRelativeTime(tx.createdAt)}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${isCredit ? 'text-emerald-400' : 'text-white'}`}>
          {sign}{formatCurrency(Math.abs(tx.amount / 100), tx.currency)}
        </p>
        <Badge status={tx.status} className="mt-0.5 text-[10px]" />
      </div>
    </div>
  );
}
