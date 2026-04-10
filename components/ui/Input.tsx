import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-white/70"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full px-3 py-2 text-sm rounded-lg',
            'bg-white/5 border border-white/10',
            'text-white placeholder-white/30',
            'focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/50 focus:border-[#1A6BFF]/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-red-500/60 focus:ring-red-500/30' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-white/40">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
