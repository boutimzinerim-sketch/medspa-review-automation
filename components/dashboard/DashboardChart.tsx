'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DataPoint { date: string; reviews: number; response_rate?: number; }

export function DashboardChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fillOrange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5500" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#FF5500" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', color: '#1A1A1A', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '10px 14px' }}
          cursor={{ stroke: 'rgba(255,85,0,0.1)', strokeWidth: 1 }}
        />
        <Area type="monotone" dataKey="reviews" stroke="#FF5500" strokeWidth={2} fill="url(#fillOrange)"
          activeDot={{ r: 5, fill: '#FF5500', stroke: '#fff', strokeWidth: 3 }} name="Reviews" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
