import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#1A6BFF] text-white border-transparent shadow-[0_8px_24px_rgba(26,107,255,0.35)] hover:bg-[#3580ff] hover:-translate-y-px active:translate-y-0',
  secondary: 'bg-[#FF5500] text-white border-transparent shadow-[0_8px_24px_rgba(255,85,0,0.35)] hover:bg-[#ff6a1f] hover:-translate-y-px active:translate-y-0',
  outline: 'bg-transparent border border-white/[0.12] text-white hover:bg-white/[0.05] hover:border-white/[0.18]',
  ghost: 'bg-transparent border-transparent text-white/60 hover:text-white hover:bg-white/[0.05]',
  danger: 'bg-red-500 text-white border-transparent shadow-[0_8px_24px_rgba(239,68,68,0.35)] hover:bg-red-400 hover:-translate-y-px',
  glass: 'glass-card !rounded-xl text-white border-white/[0.1] hover:bg-white/[0.08] hover:shadow-[inset_0_1px_0_var(--card-highlight),0_0_24px_rgba(255,85,0,0.25)]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-[12px] rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-[13px] rounded-xl gap-2',
  lg: 'px-7 py-3 text-[14px] rounded-xl gap-2.5',
};

export function Button({ variant = 'primary', size = 'md', isLoading = false, disabled, className = '', children, ...props }: ButtonProps) {
  return (
    <button disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center font-semibold border cursor-pointer',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0',
        variantClasses[variant], sizeClasses[size], className,
      ].join(' ')} {...props}>
      {isLoading && (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
