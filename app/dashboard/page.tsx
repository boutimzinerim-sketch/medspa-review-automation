'use client';

import { useEffect, useState } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { CardHeader, Card } from '@/components/ui/Card';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { GreetingCard } from '@/components/dashboard/GreetingCard';
import { MiniCalendarHeatmap } from '@/components/dashboard/MiniCalendarHeatmap';
import { AIChatWidget } from '@/components/dashboard/AIChatWidget';
import { QuickActionRow } from '@/components/dashboard/QuickActionRow';
import { RevenueImpactCard } from '@/components/dashboard/RevenueImpactCard';
import { InsightsFeed } from '@/components/dashboard/InsightsFeed';
import { SentimentAnalyzer } from '@/components/dashboard/SentimentAnalyzer';
import { VideoTestimonialCarousel } from '@/components/dashboard/VideoTestimonialCarousel';
import { MobilePreviewCard } from '@/components/dashboard/MobilePreviewCard';
import { AIReplySuggestionCard } from '@/components/dashboard/AIReplySuggestionCard';
import type { DashboardPayload } from '@/lib/dashboard-aggregator';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d: DashboardPayload) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="animate-spin text-[#FF5500]/60" size={32} />
      </div>
    );
  }

  return (
    <div id="main-content" className="space-y-6">
      {/* Breadcrumb */}
      <div className="animate-in flex items-center gap-2 text-[11px] text-white/30">
        <span>ReviewFlow</span>
        <ChevronRight size={11} />
        <span className="text-white/50">Dashboard</span>
      </div>

      {/* Row 1: Greeting (8) + Calendar (4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 animate-in delay-1">
          <GreetingCard
            clinicName={data.clinicName}
            weeklyReviewCount={data.stats.weeklyReviewCount}
            weeklyDelta={data.stats.weeklyDelta}
            streakDays={data.streakDays}
            achievements={data.achievements}
          />
        </div>
        <div className="lg:col-span-4 animate-in delay-2">
          <MiniCalendarHeatmap days={data.calendarHeatmap} />
        </div>
      </div>

      {/* Row 2: Quick actions full width */}
      <div className="animate-in delay-3">
        <QuickActionRow />
      </div>

      {/* Row 3: Revenue (5) + Insights (4) + Sentiment (3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 animate-in delay-4">
          <RevenueImpactCard
            revenue={data.revenue}
            totalReviews={data.stats.totalReviews}
            weeklyDelta={data.stats.weeklyDelta}
          />
        </div>
        <div className="lg:col-span-4 animate-in delay-5">
          <InsightsFeed insights={data.insights} />
        </div>
        <div className="md:col-span-2 lg:col-span-3 animate-in delay-6">
          <SentimentAnalyzer score={data.sentimentScore} words={data.wordCloud} />
        </div>
      </div>

      {/* Row 4: Chart (8) + Mobile preview (4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 animate-in delay-1">
          <Card padding="md">
            <CardHeader title="Review activity" description="Last 30 days" />
            <DashboardChart data={data.chartData} />
          </Card>
        </div>
        <div className="lg:col-span-4 animate-in delay-2">
          <MobilePreviewCard
            clinicName={data.clinicName}
            averageRating={data.stats.averageRating}
            totalReviews={data.stats.totalReviews}
          />
        </div>
      </div>

      {/* Row 5: AI Reply (7) + Video carousel (5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 animate-in delay-3">
          <AIReplySuggestionCard review={data.latestNegativeReview} />
        </div>
        <div className="lg:col-span-5 animate-in delay-4">
          <VideoTestimonialCarousel testimonials={data.testimonials} />
        </div>
      </div>

      {/* Floating chat (always fixed bottom-right) */}
      <AIChatWidget />
    </div>
  );
}
