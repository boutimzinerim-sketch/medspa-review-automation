import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  accent?: boolean;
  glow?: boolean;
}

const paddingClasses = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

export function Card({ children, hoverable = false, padding = 'md', accent = false, glow = false, className = '', ...props }: CardProps) {
  return (
    <div className={[
      'relative rounded-2xl bg-white border border-black/[0.04]',
      'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      'transition-all duration-300 ease-out',
      accent ? 'border-l-[3px] border-l-[#FF5500]' : '',
      hoverable ? 'hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 cursor-pointer' : '',
      glow ? 'hover:shadow-[0_4px_20px_rgba(255,85,0,0.06)]' : '',
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
        <h3 className="text-[15px] font-semibold text-[#1A1A1A] tracking-[-0.01em]">{title}</h3>
        {description && <p className="text-[12px] text-[#9CA3AF] mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
