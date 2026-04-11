'use client';

import { Flame, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import type { Achievement } from '@/lib/dashboard-mocks';

interface GreetingCardProps {
  clinicName: string;
  weeklyReviewCount: number;
  weeklyDelta: number;
  streakDays: number;
  achievements: Achievement[];
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getDateLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();
}

export function GreetingCard({ clinicName, weeklyReviewCount, weeklyDelta, streakDays, achievements }: GreetingCardProps) {
  const greeting = getTimeOfDayGreeting();
  const dateLabel = getDateLabel();
  const trendingUp = weeklyDelta >= 0;
  const topUnlocked = [...achievements].reverse().find((a) => a.unlocked);

  return (
    <div className="glass-card p-8 relative overflow-hidden">
      {/* Decorative orange→blue gradient blob */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF5500, transparent 70%)' }} />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #1A6BFF, transparent 70%)' }} />

      <div className="relative">
        <p className="text-[10px] font-semibold text-white/40 tracking-[0.18em] mb-3">{dateLabel}</p>

        <h1 className="font-display text-[40px] md:text-[44px] text-white tracking-[-0.02em] leading-[0.95]">
          {greeting},
        </h1>
        <h2 className="font-display text-[40px] md:text-[44px] text-white tracking-[-0.02em] leading-[0.95] mb-5">
          <span className="bg-gradient-to-r from-[#FF5500] to-[#FF8a50] bg-clip-text text-transparent">{clinicName}</span> 👋
        </h2>

        {/* Weekly summary line */}
        <p className="text-[15px] text-white/70 leading-relaxed max-w-xl mb-6">
          You collected{' '}
          <span className="text-white font-semibold">{weeklyReviewCount} new 5-star review{weeklyReviewCount === 1 ? '' : 's'}</span>{' '}
          this week.{' '}
          <span className={trendingUp ? 'text-[#34d399]' : 'text-[#f87171]'}>
            {trendingUp ? '+' : ''}{weeklyDelta}% vs last week
          </span>
          {trendingUp ? ' — keep it going!' : ' — let\'s turn it around.'}
        </p>

        {/* Streak + achievement chips */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
            <Flame size={15} className="text-[#FF5500]" fill="#FF5500" />
            <span className="text-[12px] font-bold text-white tabular-nums">{streakDays}-day streak</span>
            <span className="text-[12px]">🔥</span>
          </div>

          {topUnlocked && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
              <span className="text-[14px]">{topUnlocked.emoji}</span>
              <span className="text-[12px] font-semibold text-white">{topUnlocked.label}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF5500]/15 to-[#1A6BFF]/15 border border-white/[0.08]">
            {trendingUp ? (
              <TrendingUp size={14} className="text-[#34d399]" />
            ) : (
              <TrendingDown size={14} className="text-[#f87171]" />
            )}
            <span className="text-[12px] font-semibold text-white">{Math.abs(weeklyDelta)}% WoW</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
            <Sparkles size={13} className="text-[#1A6BFF]" />
            <span className="text-[12px] font-semibold text-white/80">AI assistant ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
