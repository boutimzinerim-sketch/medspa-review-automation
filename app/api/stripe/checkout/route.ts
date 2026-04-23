import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';
import { stripe, resolvePlan, type PlanKey } from '@/lib/stripe';

// POST /api/stripe/checkout
// body: { plan: 'founding' | 'standard' }
// Returns { url } — redirect the user there.

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user?.clinicId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { plan?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== 'founding' && plan !== 'standard') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const { data: clinic } = await db
    .from('clinics')
    .select('id, name, email, stripe_customer_id')
    .eq('id', user.clinicId)
    .maybeSingle();

  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
  }

  const { recurringPriceId, setupPriceId } = resolvePlan(plan as PlanKey);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  let customerId = clinic.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: clinic.email,
      name: clinic.name,
      metadata: { clinic_id: clinic.id },
    });
    customerId = customer.id;
    await db.from('clinics').update({ stripe_customer_id: customerId }).eq('id', clinic.id);
  }

  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: recurringPriceId, quantity: 1 },
  ];
  if (setupPriceId) lineItems.push({ price: setupPriceId, quantity: 1 });

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: lineItems,
    allow_promotion_codes: true,
    success_url: `${siteUrl}/dashboard?checkout=success`,
    cancel_url: `${siteUrl}/dashboard?checkout=cancelled`,
    subscription_data: {
      metadata: { clinic_id: clinic.id, plan },
    },
    metadata: { clinic_id: clinic.id, plan },
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe did not return a URL' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
