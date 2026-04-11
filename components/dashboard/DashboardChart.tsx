'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DataPoint { date: string; reviews: number; response_rate?: number; }

export function DashboardChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A6BFF" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#1A6BFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: 'rgba(245,246,250,0.4)', fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
        <YAxis tick={{ fill: 'rgba(245,246,250,0.4)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: 'rgba(22,25,34,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: '#f5f6fa',
            fontSize: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            padding: '10px 14px',
          }}
          itemStyle={{ color: '#f5f6fa' }}
          labelStyle={{ color: 'rgba(245,246,250,0.5)', marginBottom: 4 }}
          cursor={{ stroke: 'rgba(26,107,255,0.25)', strokeWidth: 1 }}
        />
        <Area type="monotone" dataKey="reviews" stroke="#1A6BFF" strokeWidth={2} fill="url(#fillBlue)"
          activeDot={{ r: 5, fill: '#1A6BFF', stroke: '#0f1117', strokeWidth: 3 }} name="Reviews" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
