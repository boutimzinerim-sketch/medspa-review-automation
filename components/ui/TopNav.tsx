'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

interface TopNavProps {
  clinicName?: string;
  userEmail?: string;
}

export function TopNav({ clinicName, userEmail }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = clinicName ?? 'My Clinic';
  const initial = (userEmail?.[0] ?? 'U').toUpperCase();

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/8 bg-[#0f1117]/90 backdrop-blur-md sticky top-0 z-30">
      <span className="text-sm font-medium text-white/60">{displayName}</span>

      <div className="relative">
        <button onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-7 h-7 rounded-full bg-[#1A6BFF] flex items-center justify-center text-xs font-bold text-white">
            {initial}
          </div>
          <span className="text-sm text-white/80 hidden sm:block">{userEmail ?? 'User'}</span>
          <ChevronDown size={14} className="text-white/40" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-20 w-48 bg-[#161b27] border border-white/10 rounded-xl shadow-xl py-1">
              <div className="px-3 py-2 border-b border-white/8">
                <p className="text-xs font-medium text-white truncate">{displayName}</p>
                <p className="text-xs text-white/40 truncate">{userEmail}</p>
              </div>
              <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                <Settings size={15} /> Settings
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/' })}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
