'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

interface TopNavProps { clinicName?: string; userEmail?: string; }

export function TopNav({ clinicName, userEmail }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = clinicName ?? 'My Clinic';
  const initial = (userEmail?.[0] ?? 'U').toUpperCase();

  return (
    <header className="h-[68px] flex items-center justify-between px-8 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sticky top-0 z-30">
      <div>
        <h2 className="text-[15px] font-bold text-white tracking-[-0.01em]">{displayName}</h2>
        <p className="text-[11px] text-white/40">Welcome back</p>
      </div>

      <div className="relative">
        <button onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all duration-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF5500] to-[#1A6BFF] flex items-center justify-center text-[13px] font-bold text-white shadow-[0_0_18px_rgba(255,85,0,0.4)]">
            {initial}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-[13px] text-white font-medium">{userEmail ?? 'User'}</p>
            <p className="text-[10px] text-white/40">Admin</p>
          </div>
          <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-20 w-56 glass-card-strong py-1.5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-[13px] font-semibold text-white truncate">{displayName}</p>
                <p className="text-[11px] text-white/40 truncate mt-0.5">{userEmail}</p>
              </div>
              <div className="py-1">
                <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-all duration-150">
                  <Settings size={16} /> Settings
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-400/80 hover:text-red-300 hover:bg-red-500/[0.08] transition-all duration-150">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
