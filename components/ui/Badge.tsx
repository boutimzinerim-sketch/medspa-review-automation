import { ReactNode } from 'react';

type BadgeVariant = 'pending' | 'sent' | 'reviewed' | 'no_response' | 'clicked' | 'active' | 'inactive' | 'success' | 'warning' | 'error' | 'default';

interface BadgeProps { variant?: BadgeVariant; children: ReactNode; className?: string; dot?: boolean; }

const styles: Record<BadgeVariant, string> = {
  pending:     'bg-amber-50 text-amber-700 border-amber-200/60',
  sent:        'bg-blue-50 text-blue-700 border-blue-200/60',
  reviewed:    'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  no_response: 'bg-red-50 text-red-700 border-red-200/60',
  clicked:     'bg-violet-50 text-violet-700 border-violet-200/60',
  active:      'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  inactive:    'bg-gray-50 text-gray-500 border-gray-200/60',
  success:     'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  warning:     'bg-amber-50 text-amber-700 border-amber-200/60',
  error:       'bg-red-50 text-red-700 border-red-200/60',
  default:     'bg-gray-50 text-gray-600 border-gray-200/60',
};

export function Badge({ variant = 'default', children, className = '', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${styles[variant]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
      {children}
    </span>
  );
}
