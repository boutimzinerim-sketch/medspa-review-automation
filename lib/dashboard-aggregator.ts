// ============================================================
// dashboard-aggregator.ts
// Server-side data aggregator for the homepage dashboard.
// One trip — returns the full payload the homepage needs to
// render all 12 features. Real Supabase queries where the schema
// supports it; deterministic mocks where it doesn't.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import {
  computeRevenueAttribution,
  computeStreak,
  computeAchievements,
  staticTestimonials,
  staticInsights,
  tokenizeWordCloud,
  computeSentimentScore,
  type Achievement,
  type Insight,
  type Testimonial,
  type WordCloudEntry,
  type RevenueAttribution,
} from './dashboard-mocks';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DashboardStats {
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  monthOverMonthGrowth: number;
  thisMonthReviews: number;
  weeklyReviewCount: number;
  weeklyDelta: number;
}

export interface DashboardChartPoint {
  date: string;
  reviews: number;
}

export interface ServiceBreakdownEntry {
  service: string;
  count: number;
  percentage: number;
}

export interface CalendarHeatmapDay {
  date: string;          // ISO yyyy-mm-dd
  label: string;         // human readable
  reviews: number;
  appointments: number;
  intensity: number;     // 0..1
}

export interface NegativeReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  service: string;
  postedAt: string;
}

export interface DashboardPayload {
  clinicName: string;
  stats: DashboardStats;
  chartData: DashboardChartPoint[];
  serviceBreakdown: ServiceBreakdownEntry[];
  calendarHeatmap: CalendarHeatmapDay[];
  sentimentScore: number;
  wordCloud: WordCloudEntry[];
  revenue: RevenueAttribution;
  streakDays: number;
  achievements: Achievement[];
  insights: Insight[];
  testimonials: Testimonial[];
  latestNegativeReview: NegativeReview | null;
}

// Resolve a clinic id without forcing the demo helper. Falls back to the demo
// clinic so /api/dashboard works even when called outside an authenticated
// session (matches the existing behaviour).
async function resolveClinicId(clinicId?: string): Promise<string> {
  if (clinicId) return clinicId;
  const { data } = await db.from('clinics').select('id').limit(1).single();
  if (data?.id) return data.id;
  throw new Error('No clinic found in database');
}

export async function getDashboardData(clinicIdInput?: string): Promise<DashboardPayload> {
  const clinicId = await resolveClinicId(clinicIdInput);

  const [clinicRes, reviewsRes, patientsRes] = await Promise.all([
    db.from('clinics').select('name').eq('id', clinicId).single(),
    db
      .from('reviews')
      .select('id, rating, sentiment, service_mentioned, text, author_name, posted_at')
      .eq('clinic_id', clinicId)
      .order('posted_at', { ascending: false }),
    db
      .from('patients')
      .select('id, reviewed, last_service, appointment_date')
      .eq('clinic_id', clinicId),
  ]);

  const reviews = (reviewsRes.data ?? []) as Array<{
    id: string;
    rating: number;
    sentiment?: string;
    service_mentioned?: string;
    text?: string;
    author_name?: string;
    posted_at: string;
  }>;
  const patients = (patientsRes.data ?? []) as Array<{
    id: string;
    reviewed: boolean;
    last_service?: string;
    appointment_date?: string;
  }>;
  const clinicName = clinicRes.data?.name ?? 'Your Med Spa';

  // ----- Core stats -----
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
    : 0;

  const totalPatients = patients.length;
  const reviewedPatients = patients.filter((p) => p.reviewed).length;
  const responseRate = totalPatients > 0 ? Math.round((reviewedPatients / totalPatients) * 100) : 0;

  // Month-over-month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthReviews = reviews.filter((r) => new Date(r.posted_at) >= thisMonthStart).length;
  const lastMonthReviews = reviews.filter(
    (r) => new Date(r.posted_at) >= lastMonthStart && new Date(r.posted_at) < thisMonthStart,
  ).length;
  const monthOverMonthGrowth = lastMonthReviews > 0
    ? Math.round(((thisMonthReviews - lastMonthReviews) / lastMonthReviews) * 100)
    : thisMonthReviews > 0 ? 100 : 0;

  // Weekly delta
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const weeklyReviewCount = reviews.filter((r) => new Date(r.posted_at) >= sevenDaysAgo).length;
  const priorWeekCount = reviews.filter(
    (r) => new Date(r.posted_at) >= fourteenDaysAgo && new Date(r.posted_at) < sevenDaysAgo,
  ).length;
  const weeklyDelta = priorWeekCount > 0
    ? Math.round(((weeklyReviewCount - priorWeekCount) / priorWeekCount) * 100)
    : weeklyReviewCount > 0 ? 100 : 0;

  const stats: DashboardStats = {
    totalReviews,
    averageRating,
    responseRate,
    monthOverMonthGrowth,
    thisMonthReviews,
    weeklyReviewCount,
    weeklyDelta,
  };

  // ----- 30-day chart -----
  const chartData: DashboardChartPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const count = reviews.filter(
      (r) => new Date(r.posted_at) >= dayStart && new Date(r.posted_at) < dayEnd,
    ).length;
    chartData.push({ date: dateStr, reviews: count });
  }

  // ----- Service breakdown -----
  const serviceCounts: Record<string, number> = {};
  reviews.forEach((r) => {
    const svc = r.service_mentioned ?? 'Other';
    serviceCounts[svc] = (serviceCounts[svc] ?? 0) + 1;
  });
  const serviceBreakdown = Object.entries(serviceCounts)
    .map(([service, count]) => ({
      service,
      count,
      percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ----- 30-day calendar heatmap (reviews + appointments) -----
  const heatmap: CalendarHeatmapDay[] = [];
  let maxDayCount = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayReviews = reviews.filter(
      (r) => new Date(r.posted_at) >= dayStart && new Date(r.posted_at) < dayEnd,
    ).length;
    const dayAppointments = patients.filter((p) => {
      if (!p.appointment_date) return false;
      const appt = new Date(p.appointment_date);
      return appt >= dayStart && appt < dayEnd;
    }).length;
    const dayCount = dayReviews + dayAppointments;
    if (dayCount > maxDayCount) maxDayCount = dayCount;
    heatmap.push({ date: isoDate, label, reviews: dayReviews, appointments: dayAppointments, intensity: 0 });
  }
  // Normalize intensity 0..1 against the busiest day
  for (const day of heatmap) {
    const total = day.reviews + day.appointments;
    day.intensity = maxDayCount > 0 ? total / maxDayCount : 0;
  }

  // ----- Sentiment + word cloud -----
  const sentimentScore = computeSentimentScore(
    reviews.map((r) => ({ sentiment: r.sentiment, rating: r.rating })),
  );
  const wordCloud = tokenizeWordCloud(reviews.map((r) => r.text ?? ''), 12);

  // ----- Revenue, streak, achievements, insights, testimonials -----
  const revenue = computeRevenueAttribution(totalReviews);
  const streakDays = computeStreak(reviews.map((r) => r.posted_at));
  const achievements = computeAchievements(totalReviews);
  const insights = staticInsights({
    totalReviews,
    avgRating: averageRating,
    sentimentScore,
    weeklyDelta,
  });
  const testimonials = staticTestimonials();

  // ----- Latest negative review (rating <= 3) for AI reply card -----
  const negativeRow = reviews.find((r) => r.rating <= 3);
  const latestNegativeReview: NegativeReview | null = negativeRow
    ? {
        id: negativeRow.id,
        author: negativeRow.author_name ?? 'Anonymous',
        rating: negativeRow.rating,
        text: negativeRow.text ?? '',
        service: negativeRow.service_mentioned ?? 'Treatment',
        postedAt: negativeRow.posted_at,
      }
    : null;

  return {
    clinicName,
    stats,
    chartData,
    serviceBreakdown,
    calendarHeatmap: heatmap,
    sentimentScore,
    wordCloud,
    revenue,
    streakDays,
    achievements,
    insights,
    testimonials,
    latestNegativeReview,
  };
}
