'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Star, X } from 'lucide-react';
import type { CalendarHeatmapDay } from '@/lib/dashboard-aggregator';

interface MiniCalendarHeatmapProps {
  days: CalendarHeatmapDay[];
}

function intensityColor(intensity: number): string {
  if (intensity === 0) return 'rgba(255,255,255,0.04)';
  // Blend orange→blue based on intensity
  const alpha = 0.18 + intensity * 0.55;
  return `rgba(26, 107, 255, ${alpha})`;
}

export function MiniCalendarHeatmap({ days }: MiniCalendarHeatmapProps) {
  const [selected, setSelected] = useState<CalendarHeatmapDay | null>(null);

  // Group into weeks (7 columns, fill from oldest)
  const weeks: CalendarHeatmapDay[][] = [];
  const sorted = [...days];
  // Pad the front so the leftmost column starts on the same weekday as the oldest day
  const firstWeekday = sorted[0] ? new Date(sorted[0].date).getDay() : 0;
  const padded: (CalendarHeatmapDay | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...sorted,
  ];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7).filter(Boolean) as CalendarHeatmapDay[]);
  }

  const totalReviews = days.reduce((sum, d) => sum + d.reviews, 0);
  const totalAppointments = days.reduce((sum, d) => sum + d.appointments, 0);

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon size={14} className="text-white/60" />
            <h3 className="text-[13px] font-semibold text-white">Last 30 days</h3>
          </div>
          <p className="text-[11px] text-white/40">Click any day for details</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold text-white tabular-nums">{totalAppointments}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">appointments</p>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="flex items-start gap-1.5">
        <div className="flex flex-col gap-1.5 pt-0">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="text-[9px] text-white/30 w-3 h-5 flex items-center justify-center">{d}</span>
          ))}
        </div>
        <div className="flex gap-1.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1.5">
              {Array.from({ length: 7 }).map((_, di) => {
                const day = week[di];
                if (!day) return <div key={di} className="w-5 h-5" />;
                const total = day.reviews + day.appointments;
                return (
                  <button
                    key={di}
                    onClick={() => setSelected(day)}
                    title={`${day.label}: ${day.reviews} reviews, ${day.appointments} appointments`}
                    className="w-5 h-5 rounded-[5px] border border-white/[0.04] hover:border-white/[0.2] hover:scale-110 transition-all duration-150 cursor-pointer relative group"
                    style={{ background: intensityColor(day.intensity) }}
                  >
                    {total > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between text-[10px] text-white/40">
        <span>{totalReviews} reviews this period</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-sm border border-white/[0.04]" style={{ background: intensityColor(i) }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Day detail popover */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative glass-card-strong p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X size={16} />
            </button>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-1">{selected.label}</p>
            <h4 className="font-display text-[24px] text-white mb-4">Day in review</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-[12px] text-white/60"><Star size={12} className="text-[#1A6BFF]" /> Reviews posted</span>
                <span className="text-[16px] font-bold text-white tabular-nums">{selected.reviews}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-[12px] text-white/60"><CalendarIcon size={12} className="text-[#1A6BFF]" /> Appointments</span>
                <span className="text-[16px] font-bold text-white tabular-nums">{selected.appointments}</span>
              </div>
              {selected.reviews + selected.appointments === 0 && (
                <p className="text-[12px] text-white/40 text-center py-2">No activity on this day.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
