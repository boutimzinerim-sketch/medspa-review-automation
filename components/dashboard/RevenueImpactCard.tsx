'use client';

import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { RevenueAttribution } from '@/lib/dashboard-mocks';

interface RevenueImpactCardProps {
  revenue: RevenueAttribution;
  totalReviews: number;
  weeklyDelta: number;
}

export function RevenueImpactCard({ revenue, totalReviews, weeklyDelta }: RevenueImpactCardProps) {
  const trendingUp = weeklyDelta >= 0;

  return (
    <div className="glass-card p-6 h-full relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)' }} />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#34d399]/15 flex items-center justify-center">
            <DollarSign size={15} className="text-[#34d399]" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-white">Revenue Impact</h3>
            <p className="text-[10px] text-white/40">Estimated attribution</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[11px] text-white/50 mb-1">Your {totalReviews} reviews generated</p>
          <p className="font-display text-[44px] md:text-[52px] text-white tabular-nums leading-none tracking-[-0.02em]">
            <span className="bg-gradient-to-r from-[#34d399] to-[#1A6BFF] bg-clip-text text-transparent">
              {revenue.formatted}
            </span>
          </p>
          <p className="text-[11px] text-white/50 mt-2">in attributed lifetime revenue</p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
          <div className="flex-1">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">ROI multiple</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold text-white tabular-nums">{revenue.roiMultiple}×</span>
              <span className="text-[10px] text-white/50">vs subscription</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg ${trendingUp ? 'bg-[#34d399]/15 text-[#34d399]' : 'bg-[#f87171]/15 text-[#f87171]'}`}>
            {trendingUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span className="text-[11px] font-bold tabular-nums">{trendingUp ? '+' : ''}{weeklyDelta}%</span>
          </div>
        </div>

        <p className="text-[10px] text-white/35 mt-3 italic">
          ReviewFlow paid for itself <span className="text-white/60 font-semibold">{revenue.roiMultiple}×</span> over this period.
        </p>
      </div>
    </div>
  );
}
