import Stripe from 'stripe';

// ============================================================================
// Stripe client + plan config
// ============================================================================
// Two products:
//   - Founding Clinic: $197 CAD/month (first 50 clinics)
//   - Standard:        $396 CAD/month + $697 CAD one-time setup
//
// Price IDs come from the Stripe Dashboard — set after creating the products.
// Subscription schedules (auto-rolling founding → standard at month 6) are
// out of scope for this MVP; manual upgrade via Stripe Dashboard for now.
// ============================================================================

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('[stripe] STRIPE_SECRET_KEY is required');
  cached = new Stripe(key);
  return cached;
}

export type PlanKey = 'founding' | 'standard';

export function resolvePlan(key: PlanKey): {
  recurringPriceId: string;
  setupPriceId: string | null;
} {
  if (key === 'founding') {
    const id = process.env.STRIPE_PRICE_FOUNDING_MONTHLY;
    if (!id) throw new Error('[stripe] STRIPE_PRICE_FOUNDING_MONTHLY is required');
    return { recurringPriceId: id, setupPriceId: null };
  }
  const recurring = process.env.STRIPE_PRICE_STANDARD_MONTHLY;
  const setup = process.env.STRIPE_PRICE_STANDARD_SETUP ?? null;
  if (!recurring) throw new Error('[stripe] STRIPE_PRICE_STANDARD_MONTHLY is required');
  return { recurringPriceId: recurring, setupPriceId: setup };
}
