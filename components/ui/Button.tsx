import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#1A1A1A] text-white border-transparent shadow-sm hover:bg-[#333] hover:shadow-md hover:-translate-y-px active:translate-y-0',
  secondary: 'bg-[#FF5500] text-white border-transparent shadow-sm shadow-[#FF5500]/15 hover:bg-[#E64D00] hover:shadow-md hover:-translate-y-px active:translate-y-0',
  outline: 'bg-white border border-black/[0.1] text-[#1A1A1A] hover:bg-[#F5F0EA] hover:border-black/[0.15]',
  ghost: 'bg-transparent border-transparent text-[#6B7280] hover:text-[#1A1A1A] hover:bg-black/[0.03]',
  danger: 'bg-red-600 text-white border-transparent shadow-sm hover:bg-red-700 hover:-translate-y-px',
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A6BFF]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0EA]',
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
