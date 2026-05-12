import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, suffix, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-white/70">{label}</label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3.5 text-white/40 pointer-events-none">{prefix}</span>
          )}
          <input
            ref={ref}
            className={cn(
              'input-glass w-full px-4 py-3 text-sm',
              prefix ? 'pl-10' : undefined,
              suffix ? 'pr-10' : undefined,
              error && 'border-rose-500/50 focus:border-rose-500',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3.5 text-white/40">{suffix}</span>
          )}
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
