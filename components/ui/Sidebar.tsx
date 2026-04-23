'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Users, Zap, Star, BarChart2, Settings, LogOut, Search, Sparkles } from 'lucide-react';

const mainNav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Patients', href: '/dashboard/patients', icon: Users },
  { label: 'Automations', href: '/dashboard/automations', icon: Zap },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
];
const secondaryNav = [
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  function NavItem({ label, href, icon: Icon }: { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
    const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
    return (
      <Link href={href} className={[
        'flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 relative',
        isActive ? 'bg-white/[0.08] text-white' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]',
      ].join(' ')}>
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#D4713A] rounded-r-full" />}
        <Icon size={18} />
        {label}
      </Link>
    );
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 w-[260px] hidden md:flex flex-col bg-[#000000] border-r border-white/[0.06]">
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4713A] flex items-center justify-center shadow-[0_0_24px_rgba(212,113,58,0.45)]">
              <Star size={14} className="text-white fill-white" />
            </div>
            <div>
              <span className="font-bold text-[15px] text-white tracking-[-0.01em] block leading-none">ReviewFlow</span>
              <span className="text-[9px] text-white/30 font-medium tracking-[0.08em] uppercase mt-0.5 block">Med Spa Suite</span>
            </div>
          </div>
        </div>

        <div className="mx-5 border-t border-white/[0.06]" />

        <div className="px-4 py-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] text-white/30 text-[12px] border border-white/[0.04]">
            <Search size={14} /><span>Search...</span>
            <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-white/30">⌘K</span>
          </div>
        </div>

        <nav className="px-3 space-y-0.5">
          <p className="px-4 mb-2 text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em]">Main</p>
          {mainNav.map((item) => <NavItem key={item.href} {...item} />)}
        </nav>

        <nav className="px-3 mt-6 space-y-0.5">
          <p className="px-4 mb-2 text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em]">System</p>
          {secondaryNav.map((item) => <NavItem key={item.href} {...item} />)}
        </nav>

        <div className="flex-1" />

        {/* Upgrade CTA card */}
        <div className="px-4 pb-4">
          <div className="relative overflow-hidden rounded-2xl p-4 border border-white/[0.08]"
            style={{ background: 'linear-gradient(135deg, rgba(212,113,58,0.18), rgba(26,107,255,0.18))' }}>
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#D4713A]/30 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-[#D4713A]" />
                <span className="text-[11px] font-bold text-white uppercase tracking-[0.08em]">Upgrade to Pro</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed mb-3">Unlock AI replies, multi-location, and advanced analytics.</p>
              <button className="w-full text-[11px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] rounded-lg py-1.5 transition-colors">
                See plans →
              </button>
            </div>
          </div>
        </div>

        <div className="px-3 py-3 border-t border-white/[0.06]">
          <button onClick={() => signOut({ callbackUrl: '/' })}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/40 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-center justify-around bg-[#000000] border-t border-white/[0.06] px-1 py-1.5 safe-area-pb">
        {mainNav.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[9px] font-medium min-w-[48px] min-h-[48px] justify-center transition-colors ${isActive ? 'text-[#D4713A]' : 'text-white/40'}`}>
              <Icon size={20} />{label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
