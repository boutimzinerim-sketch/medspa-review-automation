'use client';

import type { ServiceBreakdownEntry } from '@/lib/dashboard-aggregator';

const SERVICE_COLORS: Record<string, string> = {
  Botox: '#34d399',
  Filler: '#f472b6',
  'Laser Hair Removal': '#a78bfa',
  Microneedling: '#fb923c',
  Hydrafacial: '#38bdf8',
  'Chemical Peel': '#fb923c',
  PRP: '#34d399',
  Other: '#94a3b8',
};

function getColor(service: string): string {
  return SERVICE_COLORS[service] ?? '#94a3b8';
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const barWidth = 5;
  const gap = 2;
  const height = 28;
  const width = data.length * (barWidth + gap) - gap;

  return (
    <svg width={width} height={height} className="shrink-0">
      {data.map((val, i) => {
        const barHeight = Math.max((val / max) * height, 2);
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={2}
            fill={color}
            opacity={val > 0 ? 0.7 : 0.12}
          />
        );
      })}
    </svg>
  );
}

interface ServiceRatingListProps {
  services: ServiceBreakdownEntry[];
}

export function ServiceRatingList({ services }: ServiceRatingListProps) {
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Services overview</h3>
        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{services.length} services</span>
      </div>

      <div className="flex-1 flex flex-col gap-1.5">
        {services.map((svc) => {
          const color = getColor(svc.service);
          return (
            <div
              key={svc.service}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border hover:bg-black/[0.015] transition-colors"
              style={{ borderColor: 'var(--card-border)' }}
            >
              {/* Color accent bar */}
              <div className="w-[3px] h-7 rounded-full shrink-0" style={{ background: color }} />

              {/* Service name + count */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text)' }}>{svc.service}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{svc.count} reviews</p>
              </div>

              {/* Sparkline */}
              <Sparkline data={svc.recentTrend ?? []} color={color} />

              {/* Rating */}
              <div className="text-right shrink-0 w-10">
                <p className="text-[18px] font-bold tabular-nums leading-none" style={{ color }}>
                  {svc.averageRating && svc.averageRating > 0 ? svc.averageRating.toFixed(1) : '--'}
                </p>
                <p className="text-[8px] uppercase" style={{ color: 'var(--text-faint)' }}>/ 5</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
