import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CASL / Loi 25 blocklist middleware
// ============================================================================
// Every outbound email or SMS passes through isBlocked() before dispatch.
// Scope is PER-CLINIC — CASL treats opt-out as sender-specific, and the
// unsubscribes table enforces unique(clinic_id, email) + unique(clinic_id, phone).
//
// Fails CLOSED on query error: a CASL violation is more expensive than a
// missed review request. Spurious blocks surface on message_sends.status=failed
// with a retryable error_message.
//
// Callers must persist:
//   - result.checkedAt  → message_sends.blocklist_checked_at
//   - !result.blocked   → message_sends.consent_verified
// ============================================================================

export type BlocklistSource = 'sms_stop' | 'email_link' | 'manual' | 'bounce';

export type IsBlockedInput = {
  clinicId: string;
  email?: string | null;
  phone?: string | null;
};

export type BlocklistCheck = {
  blocked: boolean;
  reason?: string;
  matchedOn?: 'email' | 'phone';
  source?: BlocklistSource;
  checkedAt: string; // ISO — persist on message_sends.blocklist_checked_at
};

export type AddToBlocklistInput = {
  clinicId: string;
  email?: string | null;
  phone?: string | null;
  source: BlocklistSource;
  reason?: string;
};

let cached: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[blocklist] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
    );
  }
  cached = createClient(url, key);
  return cached;
}

/**
 * Check whether a recipient has unsubscribed from this clinic's sends.
 * Fails closed: transient DB errors return `blocked: true`.
 */
export async function isBlocked(input: IsBlockedInput): Promise<BlocklistCheck> {
  const checkedAt = new Date().toISOString();
  const { clinicId } = input;
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (!email && !phone) {
    return {
      blocked: true,
      reason: 'No email or phone to check',
      checkedAt,
    };
  }

  const filters: string[] = [];
  if (email) filters.push(`email.eq.${email}`);
  if (phone) filters.push(`phone.eq.${phone}`);

  const { data, error } = await db()
    .from('unsubscribes')
    .select('email, phone, source, unsubscribed_at, reason')
    .eq('clinic_id', clinicId)
    .or(filters.join(','))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[blocklist] check failed, failing closed:', error.message);
    return {
      blocked: true,
      reason: `Blocklist check failed: ${error.message}`,
      checkedAt,
    };
  }

  if (!data) {
    return { blocked: false, checkedAt };
  }

  const matchedOn: 'email' | 'phone' =
    email && typeof data.email === 'string' && data.email.toLowerCase() === email
      ? 'email'
      : 'phone';

  return {
    blocked: true,
    reason: `Unsubscribed via ${data.source ?? 'unknown'} on ${data.unsubscribed_at}`,
    matchedOn,
    source: (data.source as BlocklistSource) ?? undefined,
    checkedAt,
  };
}

/**
 * Register an unsubscribe. Idempotent — repeated calls on an already-blocked
 * identifier are no-ops thanks to the (clinic_id, email) / (clinic_id, phone)
 * unique constraints.
 *
 * Writes one row per identifier: if a caller passes both email and phone, two
 * rows land. That's intentional — someone may unsubscribe via SMS STOP but
 * still be reachable by email, or vice versa.
 */
export async function addToBlocklist(input: AddToBlocklistInput): Promise<void> {
  const { clinicId, source, reason } = input;
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (!email && !phone) {
    throw new Error('addToBlocklist requires at least one of email or phone');
  }

  if (email) {
    const { error } = await db()
      .from('unsubscribes')
      .upsert(
        { clinic_id: clinicId, email, source, reason: reason ?? null },
        { onConflict: 'clinic_id,email', ignoreDuplicates: true },
      );
    if (error) throw new Error(`[blocklist] add(email) failed: ${error.message}`);
  }

  if (phone) {
    const { error } = await db()
      .from('unsubscribes')
      .upsert(
        { clinic_id: clinicId, phone, source, reason: reason ?? null },
        { onConflict: 'clinic_id,phone', ignoreDuplicates: true },
      );
    if (error) throw new Error(`[blocklist] add(phone) failed: ${error.message}`);
  }
}

function normalizeEmail(v: string | null | undefined): string | null {
  if (!v) return null;
  const trimmed = v.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhone(v: string | null | undefined): string | null {
  if (!v) return null;
  // Keep digits + a leading + (E.164-friendly). Everything else is noise.
  const cleaned = v.trim().replace(/[^\d+]/g, '');
  return cleaned.length > 0 ? cleaned : null;
}
