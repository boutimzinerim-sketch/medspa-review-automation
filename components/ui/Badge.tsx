import { ReactNode } from 'react';

type BadgeVariant =
  | 'pending'
  | 'sent'
  | 'reviewed'
  | 'no_response'
  | 'clicked'
  | 'active'
  | 'inactive'
  | 'success'
  | 'warning'
  | 'error'
  | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  sent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  reviewed: 'bg-green-500/15 text-green-400 border-green-500/20',
  no_response: 'bg-red-500/15 text-red-400 border-red-500/20',
  clicked: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  active: 'bg-green-500/15 text-green-400 border-green-500/20',
  inactive: 'bg-white/8 text-white/40 border-white/10',
  success: 'bg-green-500/15 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/15 text-red-400 border-red-500/20',
  default: 'bg-white/8 text-white/60 border-white/10',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
