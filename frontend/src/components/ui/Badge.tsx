import { cn } from '@/lib/utils';

type Status = 'COMPLETED' | 'PENDING' | 'FAILED' | 'PROCESSING' | string;

const map: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PENDING:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PROCESSING:'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FAILED:    'bg-rose-500/20 text-rose-400 border-rose-500/30',
  EXPIRED:   'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function Badge({ status, className }: { status: Status; className?: string }) {
  const style = map[status?.toUpperCase()] || map.PENDING;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', style, className)}>
      {status}
    </span>
  );
}
