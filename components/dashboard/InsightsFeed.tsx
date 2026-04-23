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
      className="card-purple p-6 h-full relative overflow-hidden flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#1A1A1A]/15 flex items-center justify-center">
            <Sparkles size={14} className="text-[#D4713A]" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-[#1A1A1A] font-bold">AI Insights</h3>
            <p className="text-[10px] text-[#1A1A1A]/50">Auto-generated · {active + 1}/{insights.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActive((i) => (i - 1 + insights.length) % insights.length)}
            className="w-7 h-7 rounded-lg bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/15 border border-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setActive((i) => (i + 1) % insights.length)}
            className="w-7 h-7 rounded-lg bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/15 border border-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div key={current.id} className="flex-1 animate-in">
        <div className="w-10 h-10 rounded-xl bg-[#1A1A1A]/15 flex items-center justify-center mb-2"><Sparkles size={18} className="text-[#D4713A]" /></div>
        <p className="text-[14px] font-bold text-[#1A1A1A] leading-snug mb-2">{current.title}</p>
        <p className="text-[12px] text-[#1A1A1A]/60 leading-relaxed">{current.body}</p>
      </div>

      <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-[#1A1A1A]/10">
        {insights.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === active ? 'w-8 bg-[#1A1A1A]' : 'w-1.5 bg-[#1A1A1A]/15 hover:bg-[#1A1A1A]/25'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
