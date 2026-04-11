// ============================================================
// dashboard-mocks.ts
// Pure, deterministic helpers used to fill in fields where the
// Supabase schema doesn't yet have a real source. Outputs are
// derived from real inputs (no Math.random) so the demo video is
// reproducible. Replace these with real queries post-launch.
// ============================================================

const REVENUE_PER_REVIEW = 100;       // assumed lifetime value lift per 5★ review
const ASSUMED_MONTHLY_COST = 400;     // ReviewFlow assumed price for ROI math

export interface RevenueAttribution {
  totalRevenue: number;
  perReview: number;
  monthlyCost: number;
  roiMultiple: number;
  formatted: string;
}

export function computeRevenueAttribution(reviewCount: number): RevenueAttribution {
  const totalRevenue = reviewCount * REVENUE_PER_REVIEW;
  const roiMultiple = ASSUMED_MONTHLY_COST > 0 ? Math.round((totalRevenue / ASSUMED_MONTHLY_COST) * 10) / 10 : 0;
  return {
    totalRevenue,
    perReview: REVENUE_PER_REVIEW,
    monthlyCost: ASSUMED_MONTHLY_COST,
    roiMultiple,
    formatted: `$${totalRevenue.toLocaleString('en-US')}`,
  };
}

// Compute the longest CURRENT streak of consecutive days that ended within the
// last 24 hours and have ≥1 review. Looks at posted_at timestamps.
export function computeStreak(postedDates: Array<Date | string>): number {
  if (postedDates.length === 0) return 0;
  const dayKeys = new Set<string>();
  for (const d of postedDates) {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) continue;
    dayKeys.add(dt.toISOString().slice(0, 10));
  }
  let streak = 0;
  const cursor = new Date();
  // Start from today; if today has no review, also try yesterday so the streak
  // doesn't reset on the first hour of a new day.
  if (!dayKeys.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface Achievement {
  id: string;
  label: string;
  emoji: string;
  unlocked: boolean;
  threshold: number;
}

export function computeAchievements(reviewCount: number): Achievement[] {
  const milestones: Array<Omit<Achievement, 'unlocked'>> = [
    { id: 'first10', label: 'First 10 reviews', emoji: '🌱', threshold: 10 },
    { id: 'fifty', label: '50 review milestone', emoji: '⭐', threshold: 50 },
    { id: 'hundred', label: 'Reached 100 reviews', emoji: '🎖️', threshold: 100 },
    { id: 'fivehundred', label: '500-review legend', emoji: '🏆', threshold: 500 },
  ];
  return milestones.map((m) => ({ ...m, unlocked: reviewCount >= m.threshold }));
}

export interface Testimonial {
  id: string;
  name: string;
  service: string;
  quote: string;
  thumbnail: string; // gradient seed for SVG
}

export function staticTestimonials(): Testimonial[] {
  return [
    {
      id: 't1',
      name: 'Jessica M.',
      service: 'Hydrafacial',
      quote: 'My skin has never looked better. The team is incredible.',
      thumbnail: 'linear-gradient(135deg, #FF5500, #ff8a50)',
    },
    {
      id: 't2',
      name: 'Sarah K.',
      service: 'Botox',
      quote: 'Natural-looking results and zero pain. I\'m a forever client.',
      thumbnail: 'linear-gradient(135deg, #1A6BFF, #6ba8ff)',
    },
    {
      id: 't3',
      name: 'Amanda R.',
      service: 'Microneedling',
      quote: 'I drove an hour to see them and it was 100% worth it.',
      thumbnail: 'linear-gradient(135deg, #34d399, #1A6BFF)',
    },
  ];
}

export interface Insight {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

// Built from real stats so the strings reference real numbers.
export function staticInsights(stats: { totalReviews: number; avgRating: number; sentimentScore: number; weeklyDelta: number }): Insight[] {
  const sentimentLabel = stats.sentimentScore >= 9 ? 'Excellent' : stats.sentimentScore >= 7 ? 'Strong' : stats.sentimentScore >= 5 ? 'Mixed' : 'Needs work';
  const weeklyDeltaText = stats.weeklyDelta >= 0
    ? `up ${stats.weeklyDelta}% vs last week`
    : `down ${Math.abs(stats.weeklyDelta)}% vs last week`;
  return [
    {
      id: 'i1',
      emoji: '💡',
      title: 'Best day to ask for reviews',
      body: 'Botox reviews posted on Tuesdays get 3× more engagement than weekend posts. Try shifting your reminder send time.',
    },
    {
      id: 'i2',
      emoji: '🎯',
      title: `Your sentiment: ${stats.sentimentScore.toFixed(1)} / 10 (${sentimentLabel})`,
      body: `Across ${stats.totalReviews} reviews, average rating is ${stats.avgRating.toFixed(1)} stars. Reviews are ${weeklyDeltaText}.`,
    },
    {
      id: 'i3',
      emoji: '📞',
      title: 'Recommended next action',
      body: 'Reach out to patients from the last 14 days who haven\'t reviewed yet. They\'re 4× more likely to leave a 5★ review.',
    },
    {
      id: 'i4',
      emoji: '🚀',
      title: 'Trending up',
      body: 'Hydrafacial and Microneedling are your fastest-growing categories. Consider running a referral promo on these.',
    },
  ];
}

// Tokenize review text into a top-N word frequency list, ignoring stop words.
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','to','of','for','in','on','at','with',
  'by','from','as','is','was','are','were','be','been','being','have','has',
  'had','do','does','did','will','would','should','could','may','might','must',
  'can','this','that','these','those','i','you','he','she','it','we','they',
  'me','him','her','us','them','my','your','his','its','our','their','am',
  'so','very','just','really','more','most','some','any','all','each','every',
  'no','not','only','than','then','too','also','again','out','up','down','here',
  'there','when','where','why','how','what','which','who','whom','because','about',
  'into','through','during','before','after','above','below','between','under','over',
  'will','would','got','get','go','went','come','came','see','saw','take','took',
  'made','make','one','two','three','first','second','last','next','always','ever',
  'never','still','already','yet','now','today','yesterday','tomorrow','my','i\'m',
  'don\'t','it\'s','i\'ve','they\'re','we\'re','you\'re','that\'s','there\'s','can\'t',
]);

export interface WordCloudEntry { word: string; count: number; }

export function tokenizeWordCloud(reviewTexts: string[], topN = 12): WordCloudEntry[] {
  const counts = new Map<string, number>();
  for (const text of reviewTexts) {
    if (!text) continue;
    const words = text.toLowerCase().match(/[a-z][a-z']+/g) ?? [];
    for (const w of words) {
      if (w.length < 4) continue;
      if (STOP_WORDS.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

// Compute a 0-10 sentiment score from raw rows. Uses numeric sentiment if
// present, otherwise derives from rating.
export function computeSentimentScore(rows: Array<{ sentiment?: string; rating: number }>): number {
  if (rows.length === 0) return 0;
  let total = 0;
  for (const r of rows) {
    if (r.sentiment === 'positive') total += 10;
    else if (r.sentiment === 'neutral') total += 6;
    else if (r.sentiment === 'negative') total += 2;
    else total += (r.rating / 5) * 10;
  }
  return Math.round((total / rows.length) * 10) / 10;
}
