'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface DataPoint {
  date: string;
  reviews: number;
  response_rate?: number;
}

interface DashboardChartProps {
  data: DataPoint[];
}

export function DashboardChart({ data }: DashboardChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={6}
        />
        <YAxis
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#161b27',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: 12,
          }}
          itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
          cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <Line
          type="monotone"
          dataKey="reviews"
          stroke="#FF5500"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#FF5500' }}
          name="Reviews"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
