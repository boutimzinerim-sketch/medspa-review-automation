import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDemoClinicId } from '@/lib/demo-clinic';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const clinicId = await getDemoClinicId();

  // Run queries in parallel
  const [reviewsRes, patientsRes, recentReviewsRes] = await Promise.all([
    db.from('reviews').select('rating, service_mentioned, posted_at').eq('clinic_id', clinicId),
    db.from('patients').select('reviewed, last_service, appointment_date').eq('clinic_id', clinicId),
    db.from('reviews')
      .select('posted_at, rating')
      .eq('clinic_id', clinicId)
      .gte('posted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('posted_at', { ascending: true }),
  ]);

  const reviews = reviewsRes.data ?? [];
  const patients = patientsRes.data ?? [];
  const recentReviews = recentReviewsRes.data ?? [];

  // KPIs
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
    : 0;
  const totalPatients = patients.length;
  const reviewedPatients = patients.filter((p) => p.reviewed).length;
  const responseRate = totalPatients > 0
    ? Math.round((reviewedPatients / totalPatients) * 100)
    : 0;

  // Month-over-month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthReviews = reviews.filter((r) => new Date(r.posted_at) >= thisMonthStart).length;
  const lastMonthReviews = reviews.filter(
    (r) => new Date(r.posted_at) >= lastMonthStart && new Date(r.posted_at) < thisMonthStart
  ).length;
  const growth = lastMonthReviews > 0
    ? Math.round(((thisMonthReviews - lastMonthReviews) / lastMonthReviews) * 100)
    : thisMonthReviews > 0 ? 100 : 0;

  // Chart data: reviews per day (last 30 days)
  const chartData: { date: string; reviews: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const count = recentReviews.filter(
      (r) => new Date(r.posted_at) >= dayStart && new Date(r.posted_at) < dayEnd
    ).length;
    chartData.push({ date: dateStr, reviews: count });
  }

  // Service breakdown
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

  return NextResponse.json({
    stats: {
      total_reviews: totalReviews,
      average_rating: avgRating,
      response_rate: responseRate,
      month_over_month_growth: growth,
      this_month_reviews: thisMonthReviews,
    },
    chartData,
    serviceBreakdown,
  });
}
