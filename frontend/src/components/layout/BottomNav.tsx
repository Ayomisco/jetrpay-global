'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Home',    icon: '⌂' },
  { href: '/send',      label: 'Send',    icon: '↑' },
  { href: '/receive',   label: 'Receive', icon: '↓' },
  { href: '/history',   label: 'History', icon: '⧗' },
  { href: '/profile',   label: 'Profile', icon: '◎' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-white/8 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
                active ? 'text-indigo-400' : 'text-white/40'
              )}
            >
              <span className={cn('text-xl leading-none', active && 'drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]')}>
                {icon}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
