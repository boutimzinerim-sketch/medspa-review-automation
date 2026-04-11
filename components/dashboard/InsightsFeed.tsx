'use client';

import { useEffect, useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Insight } from '@/lib/dashboard-mocks';

interface InsightsFeedProps {
  insights: Insight[];
}

export function InsightsFeed({ insights }: InsightsFeedProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || insights.length === 0) return;
    const interval = setInterval(() => setActive((i) => (i + 1) % insights.length), 5000);
    return () => clearInterval(interval);
  }, [paused, insights.length]);

  if (insights.length === 0) return null;
  const current = insights[active];

  return (
    <div
      className="glass-card p-6 h-full relative overflow-hidden flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FF5500]/15 flex items-center justify-center">
            <Sparkles size={14} className="text-[#FF5500]" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-white">AI Insights</h3>
            <p className="text-[10px] text-white/40">Auto-generated · {active + 1}/{insights.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActive((i) => (i - 1 + insights.length) % insights.length)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/60 hover:text-white"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setActive((i) => (i + 1) % insights.length)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/60 hover:text-white"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div key={current.id} className="flex-1 animate-in">
        <div className="text-[28px] mb-2">{current.emoji}</div>
        <p className="text-[14px] font-bold text-white leading-snug mb-2">{current.title}</p>
        <p className="text-[12px] text-white/60 leading-relaxed">{current.body}</p>
      </div>

      <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-white/[0.06]">
        {insights.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === active ? 'w-8 bg-[#FF5500]' : 'w-1.5 bg-white/15 hover:bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
