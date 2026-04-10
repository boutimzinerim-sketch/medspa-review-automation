'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Users, Zap, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DashboardChart } from '@/components/dashboard/DashboardChart';

interface DashboardData {
  stats: {
    total_reviews: number;
    average_rating: number;
    response_rate: number;
    month_over_month_growth: number;
    this_month_reviews: number;
  };
  chartData: { date: string; reviews: number }[];
  serviceBreakdown: { service: string; count: number; percentage: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-white/30" size={32} />
      </div>
    );
  }

  const stats = data?.stats ?? {
    total_reviews: 0,
    average_rating: 0,
    response_rate: 0,
    month_over_month_growth: 0,
    this_month_reviews: 0,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Your review performance at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Reviews"
          value={String(stats.total_reviews)}
          icon={<Star size={18} className="text-[#FF5500]" />}
          trend={`${stats.this_month_reviews} this month`}
          trendUp={stats.this_month_reviews > 0}
        />
        <KpiCard
          label="Average Rating"
          value={`${stats.average_rating}/5.0`}
          icon={<Star size={18} className="text-yellow-400" />}
          trend="Google Business"
        />
        <KpiCard
          label="Response Rate"
          value={`${stats.response_rate}%`}
          icon={<TrendingUp size={18} className="text-[#1A6BFF]" />}
          trend="patients who reviewed"
        />
        <KpiCard
          label="MoM Growth"
          value={`${stats.month_over_month_growth >= 0 ? '+' : ''}${stats.month_over_month_growth}%`}
          icon={<TrendingUp size={18} className="text-green-400" />}
          trend="vs last month"
          trendUp={stats.month_over_month_growth > 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Reviews Over Time" description="Last 30 days" />
          <DashboardChart data={data?.chartData ?? []} />
        </Card>

        <Card>
          <CardHeader title="By Service" description="Top treatment types" />
          {(data?.serviceBreakdown ?? []).length > 0 ? (
            <div className="space-y-3">
              {data!.serviceBreakdown.map(({ service, count, percentage }) => (
                <div key={service}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{service}</span>
                    <span className="text-white/50">{count} reviews</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF5500] rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30 text-center py-8">No reviews yet</p>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader title="Quick Actions" description="Get started with the most common tasks" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Import Patients', desc: 'Add patients from CSV or manually', href: '/dashboard/patients', icon: <Users size={20} className="text-[#1A6BFF]" /> },
            { label: 'Create Automation', desc: 'Set up a review request rule', href: '/dashboard/automations', icon: <Zap size={20} className="text-[#FF5500]" /> },
            { label: 'View Reviews', desc: 'Track all sent requests', href: '/dashboard/reviews', icon: <Star size={20} className="text-yellow-400" /> },
          ].map(({ label, desc, href, icon }) => (
            <Link key={href} href={href} className="flex items-center gap-4 p-4 rounded-xl bg-white/4 border border-white/8 hover:border-white/15 hover:bg-white/6 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-white/40 truncate">{desc}</p>
              </div>
              <ArrowRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon, trend, trendUp }: {
  label: string; value: string; icon: React.ReactNode; trend?: string; trendUp?: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {trend && <p className={`text-xs ${trendUp ? 'text-green-400' : 'text-white/40'}`}>{trend}</p>}
    </Card>
  );
}
