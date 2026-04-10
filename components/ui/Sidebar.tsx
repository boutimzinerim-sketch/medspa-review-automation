'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Users, Zap, Star, BarChart2, Settings, LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Patients', href: '/dashboard/patients', icon: Users },
  { label: 'Automations', href: '/dashboard/automations', icon: Zap },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-[#0a0d14] border-r border-white/8">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/8">
        <div className="w-8 h-8 rounded-lg bg-[#FF5500] flex items-center justify-center">
          <Star size={16} className="text-white fill-white" />
        </div>
        <span className="font-bold text-white tracking-tight">ReviewFlow</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive ? 'bg-[#FF5500]/15 text-[#FF5500]' : 'text-white/50 hover:text-white hover:bg-white/5',
              ].join(' ')}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/8">
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
