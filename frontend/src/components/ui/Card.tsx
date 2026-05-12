import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass p-5',
        glow && 'shadow-glow',
        onClick && 'cursor-pointer hover:bg-white/8 transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}
