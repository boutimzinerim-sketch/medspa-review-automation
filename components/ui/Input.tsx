import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; hint?: string; }

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-2">
        {label && <label htmlFor={inputId} className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-[0.08em]">{label}</label>}
        <input ref={ref} id={inputId}
          className={[
            'w-full px-4 py-3 text-[14px] rounded-xl text-[#1A1A1A] placeholder-[#C4C4C4]',
            'bg-white border border-black/[0.08]',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/20 focus:border-[#1A6BFF]/40',
            'hover:border-black/[0.12]',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-[#F5F0EA]',
            error ? 'border-red-500/50 focus:ring-red-500/20' : '',
            className,
          ].join(' ')} {...props} />
        {error && <p className="flex items-center gap-1.5 text-[12px] text-red-500"><svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</p>}
        {hint && !error && <p className="text-[11px] text-[#9CA3AF]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
