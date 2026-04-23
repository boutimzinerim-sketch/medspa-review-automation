import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  accent?: boolean;
  glow?: boolean;
  variant?: 'default' | 'glass';
}

const paddingClasses = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

export function Card({
  children,
  hoverable = false,
  padding = 'md',
  accent = false,
  glow = false,
  variant = 'glass',
  className = '',
  ...props
}: CardProps) {
  const isGlass = variant === 'glass';
  return (
    <div className={[
      'relative',
      isGlass
        ? 'glass-card'
        : 'rounded-2xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      'transition-all duration-300 ease-out',
      accent ? (isGlass ? 'border-l-[3px] border-l-[#D4713A]' : 'border-l-[3px] border-l-[#D4713A]') : '',
      hoverable ? (isGlass
          ? 'hover:bg-white/[0.06] hover:-translate-y-0.5 cursor-pointer'
          : 'hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 cursor-pointer') : '',
      glow ? (isGlass
          ? 'hover:shadow-[inset_0_1px_0_var(--card-highlight),0_0_32px_rgba(212,113,58,0.18)]'
          : 'hover:shadow-[0_4px_20px_rgba(212,113,58,0.06)]') : '',
      paddingClasses[padding],
      className,
    ].join(' ')} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps { title: string; description?: string; action?: ReactNode; }

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h3 className="text-[15px] font-semibold text-white tracking-[-0.01em]">{title}</h3>
        {description && <p className="text-[12px] text-white/50 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
