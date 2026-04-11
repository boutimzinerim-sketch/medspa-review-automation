'use client';

interface ScoreRingProps { value: number; max?: number; size?: number; strokeWidth?: number; color?: string; label?: string; }

export function ScoreRing({ value, max = 100, size = 80, strokeWidth = 5, color = '#FF5500', label }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(value / max, 1));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[18px] font-bold text-[#1A1A1A] tabular-nums tracking-tight">
            {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
          </span>
        </div>
      </div>
      {label && <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.1em]">{label}</span>}
    </div>
  );
}
