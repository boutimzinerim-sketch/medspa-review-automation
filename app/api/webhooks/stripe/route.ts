import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';

// ============================================================================
// Stripe webhook — /api/webhooks/stripe
// ============================================================================
// Reads raw body, verifies Stripe-Signature, maps a small whitelist of events
// onto clinics.subscription_status + related fields.
// ============================================================================

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// These are the Stripe → DB enum names (subscription_status enum).
const STATUS_MAP: Record<Stripe.Subscription.Status, string | null> = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'past_due',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
  paused: 'past_due',
};

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clinicId = (session.metadata?.clinic_id ?? null) as string | null;
        const subId = session.subscription as string | null;
        if (clinicId && subId) {
          await db
            .from('clinics')
            .update({
              stripe_subscription_id: subId,
              setup_fee_paid_at:
                session.amount_total && session.amount_total > 0
                  ? new Date().toISOString()
                  : null,
            })
            .eq('id', clinicId);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const clinicId = await resolveClinicId(sub);
        if (!clinicId) break;

        // Stripe moved current_period_end onto the per-item schedule in recent
        // API versions; read from items[0] as the canonical billing cycle end.
        const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null;
        await db
          .from('clinics')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: STATUS_MAP[sub.status] ?? null,
            subscription_current_period_end:
              typeof periodEnd === 'number'
                ? new Date(periodEnd * 1000).toISOString()
                : null,
          })
          .eq('id', clinicId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
        if (!customerId) break;
        await db
          .from('clinics')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);
        break;
      }

      default:
        // Ignore unhandled events but still 200 to acknowledge receipt
        break;
    }
  } catch (err) {
    console.error('[stripe:webhook] handler error', event.type, err);
    // Return 500 so Stripe retries transient failures
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function resolveClinicId(sub: Stripe.Subscription): Promise<string | null> {
  const metaClinicId = (sub.metadata?.clinic_id ?? null) as string | null;
  if (metaClinicId) return metaClinicId;

  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
  if (!customerId) return null;

  const { data } = await db
    .from('clinics')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
