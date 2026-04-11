'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Star, Zap, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('test@medspa.com');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => { if (status === 'authenticated') router.push('/dashboard'); }, [status, router]);

  if (status === 'loading' || session) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F0EA]"><div className="w-6 h-6 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin" /></div>;
  }

  async function handleSignIn() { setIsSigningIn(true); await signIn('credentials', { email, callbackUrl: '/dashboard' }); setIsSigningIn(false); }

  return (
    <main className="min-h-screen bg-[#F5F0EA] flex flex-col items-center justify-center p-6 relative">
      <div className="relative z-10 max-w-md w-full animate-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-16">
          <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center shadow-lg">
            <Star size={20} className="text-white fill-white" />
          </div>
          <span className="text-[22px] font-bold text-[#1A1A1A] tracking-[-0.02em]">ReviewFlow</span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-center text-[42px] sm:text-[50px] text-[#1A1A1A] leading-[1.08] tracking-[-0.02em] mb-5" style={{ textWrap: 'balance' } as React.CSSProperties}>
          Turn every treatment into a 5-star review
        </h1>
        <p className="text-center text-[15px] text-[#6B7280] mb-14 leading-relaxed max-w-sm mx-auto">
          Automated review collection for med spas and aesthetics clinics.
        </p>

        {/* Auth card */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.05)] max-w-xs mx-auto">
          <div className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()} placeholder="test@medspa.com"
              className="w-full px-4 py-3 rounded-xl bg-[#F5F0EA]/50 border border-black/[0.06] text-[#1A1A1A] text-[14px] placeholder-[#C4C4C4] focus:outline-none focus:ring-2 focus:ring-[#1A6BFF]/20 focus:border-[#1A6BFF]/40 transition-all duration-200" />
            <Button size="lg" onClick={handleSignIn} isLoading={isSigningIn} className="w-full">Sign in</Button>
          </div>
          <p className="text-center text-[10px] text-[#C4C4C4] uppercase tracking-[0.15em] mt-4">Dev mode — any email</p>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-2 gap-3">
          {[
            { icon: <Zap size={16} />, color: '#FF5500', title: 'Auto-send', desc: 'Timed review requests' },
            { icon: <Star size={16} />, color: '#1A6BFF', title: 'AI prompts', desc: 'Personalized emails' },
            { icon: <TrendingUp size={16} />, color: '#10b981', title: 'Analytics', desc: 'Track review growth' },
            { icon: <Shield size={16} />, color: '#1A1A1A', title: 'Secure', desc: 'Row-level security' },
          ].map(({ icon, color, title, desc }) => (
            <div key={title} className="rounded-xl bg-white border border-black/[0.04] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${color}10`, color }}>{icon}</div>
              <p className="text-[12px] font-semibold text-[#1A1A1A] mb-0.5">{title}</p>
              <p className="text-[11px] text-[#9CA3AF] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
