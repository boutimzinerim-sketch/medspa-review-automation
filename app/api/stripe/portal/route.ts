import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

// POST /api/stripe/portal
// Returns { url } — Stripe-hosted billing portal for the current clinic.

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST() {
  const user = await getUser();
  if (!user?.clinicId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: clinic } = await db
    .from('clinics')
    .select('stripe_customer_id')
    .eq('id', user.clinicId)
    .maybeSingle();

  if (!clinic?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer yet' }, { status: 400 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  const portal = await stripe().billingPortal.sessions.create({
    customer: clinic.stripe_customer_id,
    return_url: `${siteUrl}/dashboard`,
  });

  return NextResponse.json({ url: portal.url });
}
