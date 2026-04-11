'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Users, Zap, TrendingUp, ArrowUpRight, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { ScoreRing } from '@/components/ui/ScoreRing';

interface DashboardData {
  stats: { total_reviews: number; average_rating: number; response_rate: number; month_over_month_growth: number; this_month_reviews: number };
  chartData: { date: string; reviews: number }[];
  serviceBreakdown: { service: string; count: number; percentage: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-[#FF5500]/40" size={28} /></div>;
  }

  const s = data?.stats ?? { total_reviews: 0, average_rating: 0, response_rate: 0, month_over_month_growth: 0, this_month_reviews: 0 };

  return (
    <div id="main-content" className="space-y-10">
      {/* Breadcrumb */}
      <div className="animate-in flex items-center gap-2 text-[12px] text-[#9CA3AF]">
        <span>ReviewFlow</span><ChevronRight size={12} /><span className="text-[#6B7280]">Dashboard</span>
      </div>

      {/* Header */}
      <div className="animate-in delay-1">
        <h1 className="font-display text-[36px] text-[#1A1A1A] tracking-[-0.02em] leading-tight">Overview</h1>
        <p className="text-[14px] text-[#9CA3AF] mt-2 max-w-md">Review performance and patient engagement metrics.</p>
      </div>

      {/* Score rings */}
      <div className="animate-in delay-2">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-semibold text-[#6B7280]">Health scores & overview</h3>
            <Link href="/dashboard/analytics" className="text-[12px] text-[#FF5500] hover:text-[#E64D00] transition-colors flex items-center gap-1">
              View details <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="flex items-center justify-around py-4">
            <ScoreRing value={s.average_rating} max={5} size={88} color="#FF5500" label="Avg rating" />
            <ScoreRing value={s.response_rate} max={100} size={88} color="#1A6BFF" label="Response" />
            <ScoreRing value={s.total_reviews} max={Math.max(s.total_reviews, 100)} size={88} color="#10b981" label="Reviews" />
            <ScoreRing value={Math.abs(s.month_over_month_growth)} max={100} size={88} color="#f59e0b" label="Growth" />
          </div>
        </Card>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 animate-in delay-3">
        <MetricCard label="Total reviews" value={String(s.total_reviews)} change={`+${s.this_month_reviews} this month`} up={s.this_month_reviews > 0} />
        <MetricCard label="Average rating" value={`${s.average_rating}/5.0`} change="Google Business" />
        <MetricCard label="Response rate" value={`${s.response_rate}%`} change="of patients reviewed" />
        <MetricCard label="Month growth" value={`${s.month_over_month_growth >= 0 ? '+' : ''}${s.month_over_month_growth}%`} change="vs previous month" up={s.month_over_month_growth > 0} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 animate-in delay-4">
          <Card>
            <CardHeader title="Review activity" description="Last 30 days" />
            <DashboardChart data={data?.chartData ?? []} />
          </Card>
        </div>
        <div className="animate-in delay-5">
          <Card className="h-full">
            <CardHeader title="Services" description="Treatment breakdown" />
            {(data?.serviceBreakdown ?? []).length > 0 ? (
              <div className="space-y-4">
                {data!.serviceBreakdown.map(({ service, count, percentage }, i) => {
                  const colors = ['#FF5500', '#1A6BFF', '#10b981', '#f59e0b', '#e879a0'];
                  return (
                    <div key={service} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-[13px] mb-1">
                          <span className="text-[#6B7280]">{service}</span>
                          <span className="text-[#C4C4C4] tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 bg-[#F0ECE6] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: colors[i % colors.length] }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16">
                <Star size={20} className="text-[#E5E7EB] mb-2" />
                <p className="text-[12px] text-[#C4C4C4]">No reviews yet</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div className="animate-in delay-6">
        <h2 className="font-display text-[20px] text-[#1A1A1A] mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Import patients', desc: 'CSV or manual entry', href: '/dashboard/patients', icon: <Users size={20} />, color: '#1A6BFF' },
            { label: 'Create automation', desc: 'Review request rules', href: '/dashboard/automations', icon: <Zap size={20} />, color: '#FF5500' },
            { label: 'View reviews', desc: 'Track sent requests', href: '/dashboard/reviews', icon: <Star size={20} />, color: '#f59e0b' },
          ].map(({ label, desc, href, icon, color }) => (
            <Link key={href} href={href}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                style={{ background: `${color}10`, color }}>{icon}</div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1A1A] group-hover:text-[#1A1A1A] transition-colors">{label}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{desc}</p>
              </div>
              <ArrowUpRight size={15} className="text-[#E5E7EB] group-hover:text-[#FF5500] transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, up }: { label: string; value: string; change: string; up?: boolean }) {
  return (
    <Card accent glow>
      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.12em] mb-3">{label}</p>
      <p className="text-[24px] font-bold text-[#1A1A1A] tabular-nums tracking-tight mb-1">{value}</p>
      <p className={`text-[11px] font-medium ${up ? 'text-emerald-600' : 'text-[#C4C4C4]'}`}>{change}</p>
    </Card>
  );
}
