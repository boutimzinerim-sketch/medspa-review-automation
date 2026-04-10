'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Star, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('test@medspa.com');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.push('/dashboard');
  }, [status, router]);

  if (status === 'loading' || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="w-6 h-6 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleSignIn() {
    setIsSigningIn(true);
    await signIn('credentials', { email, callbackUrl: '/dashboard' });
    setIsSigningIn(false);
  }

  return (
    <main className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#1A6BFF]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#FF5500]/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#FF5500] flex items-center justify-center shadow-lg shadow-[#FF5500]/30">
            <Star size={20} className="text-white fill-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">ReviewFlow</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
          Turn Every Treatment Into a{' '}
          <span className="text-[#FF5500]">5-Star Review</span>
        </h1>
        <p className="text-lg text-white/50 mb-10 leading-relaxed">
          AI-powered review automation for med spas & aesthetics clinics. Set it up once — let it run forever.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
            placeholder="test@medspa.com"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF5500]/50"
          />
          <Button size="lg" onClick={handleSignIn} isLoading={isSigningIn} className="shadow-lg shadow-[#FF5500]/20">
            Sign In
          </Button>
        </div>
        <p className="text-xs text-white/30 mt-3">Dev mode — any email works, no password needed</p>

        <div className="mt-14 grid grid-cols-3 gap-4 text-left">
          {[
            { icon: <Zap size={18} className="text-[#FF5500]" />, title: 'Auto-Send', desc: 'Timed emails after every appointment' },
            { icon: <Star size={18} className="text-[#1A6BFF]" />, title: 'AI Prompts', desc: 'Claude generates personalized review asks' },
            { icon: <TrendingUp size={18} className="text-green-400" />, title: 'Track Growth', desc: 'Real-time analytics on your review rate' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white/4 border border-white/8 rounded-xl p-4">
              <div className="mb-2">{icon}</div>
              <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
              <p className="text-xs text-white/40 leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
