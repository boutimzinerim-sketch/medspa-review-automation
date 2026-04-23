import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// POST /r/[token]/submit
// ============================================================================
// Two-step submission from the magic-link landing page:
//
//   1. { rating: 1-5 }      — first click. Persists the rating, decides the
//                             routing fork. Returns { route, url? }.
//   2. { feedback: string } — only used when step 1 routed to internal_feedback.
//
// Public, unauthenticated. Token = review_request.id (UUID, 122 bits entropy).
// ============================================================================

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: { rating?: unknown; feedback?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data: rr, error: rrErr } = await db
    .from('review_requests')
    .select('id, clinic_id, star_rating_captured, routed_to, internal_feedback_submitted_at')
    .eq('id', token)
    .maybeSingle();

  if (rrErr || !rr) {
    return NextResponse.json({ error: 'Review request not found' }, { status: 404 });
  }

  const rating = Number(body.rating);
  if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
    return handleRating(token, rr, Math.round(rating));
  }

  const feedback = typeof body.feedback === 'string' ? body.feedback.trim() : '';
  if (feedback) {
    return handleFeedback(token, rr, feedback);
  }

  return NextResponse.json({ error: 'Provide rating (1-5) or feedback' }, { status: 400 });
}

async function handleRating(
  token: string,
  rr: { clinic_id: string; routed_to: string | null },
  rating: number,
) {
  // Re-click after already routed to Google — just return the URL again
  if (rr.routed_to === 'google_external') {
    const { data: clinic } = await db
      .from('clinics')
      .select('google_review_url, internal_feedback_threshold')
      .eq('id', rr.clinic_id)
      .maybeSingle();
    return NextResponse.json({
      route: 'google_external',
      url: clinic?.google_review_url ?? null,
    });
  }

  // Load clinic to resolve threshold + Google URL
  const { data: clinic } = await db
    .from('clinics')
    .select('google_review_url, internal_feedback_threshold')
    .eq('id', rr.clinic_id)
    .maybeSingle();

  const threshold = clinic?.internal_feedback_threshold ?? 3;
  const goGoogle = rating > threshold && !!clinic?.google_review_url;
  const routedTo: 'google_external' | 'internal_feedback' = goGoogle
    ? 'google_external'
    : 'internal_feedback';

  const { error: updateErr } = await db
    .from('review_requests')
    .update({
      star_rating_captured: rating,
      routed_to: routedTo,
      routed_at: new Date().toISOString(),
      response_status: 'clicked',
    })
    .eq('id', token);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    route: routedTo,
    url: goGoogle ? clinic?.google_review_url ?? null : null,
  });
}

async function handleFeedback(
  token: string,
  rr: { routed_to: string | null; internal_feedback_submitted_at: string | null },
  feedback: string,
) {
  if (rr.routed_to !== 'internal_feedback') {
    return NextResponse.json(
      { error: 'This review was not routed for internal feedback' },
      { status: 400 },
    );
  }
  if (rr.internal_feedback_submitted_at) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error } = await db
    .from('review_requests')
    .update({
      internal_feedback_text: feedback.slice(0, 4000),
      internal_feedback_submitted_at: new Date().toISOString(),
      response_status: 'reviewed',
    })
    .eq('id', token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
