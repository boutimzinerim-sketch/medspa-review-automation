import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Jane App webhook receiver
// ============================================================================
// Accepts any JSON POST from Jane, logs the raw payload to `webhook_logs`
// (P0 spec requirement), and best-effort extracts appointment + patient data.
//
// Design notes:
// - Defensive parsing: we don't yet have Jane's real payload schema, so we
//   read from several plausible field paths and fall through gracefully.
// - Every payload is logged BEFORE parsing — if parsing fails, the raw bytes
//   are still inspectable in webhook_logs for debugging.
// - Per-clinic URL: /api/webhooks/jane/[clinicId]. Clinic must exist and be
//   configured with pms_type='jane' to accept the event.
// - HMAC verification only runs if JANE_WEBHOOK_SECRET is set. Leave unset
//   during initial setup; add once Jane exposes a signing secret.
// - Cancelled appointments are LOGGED but NOT enqueued for review requests
//   (matches P0 spec explicitly).
// - Always 200 fast, even on internal errors, so Jane doesn't retry-storm us.
// ============================================================================

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> },
) {
  const { clinicId } = await params;
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  // 1. Log raw payload FIRST — we want the record even if parsing blows up.
  let payload: Record<string, unknown> = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    // Non-JSON — keep raw text under a known key so it's still queryable
    payload = { _raw: rawBody };
  }

  const eventType = extractEventType(payload);

  await db.from('webhook_logs').insert({
    clinic_id: clinicId,
    source: 'jane',
    event_type: eventType,
    payload,
    headers,
    status: 'received',
  });

  // 2. HMAC verification (only if a secret is configured)
  const signingSecret = process.env.JANE_WEBHOOK_SECRET;
  if (signingSecret) {
    const signature =
      req.headers.get('x-jane-signature') ??
      req.headers.get('x-webhook-signature') ??
      req.headers.get('x-signature');

    if (!signature || !verifySignature(rawBody, signature, signingSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // 3. Verify the clinic exists and is Jane-wired
  const { data: clinic, error: clinicErr } = await db
    .from('clinics')
    .select('id, pms_type, is_active, test_mode')
    .eq('id', clinicId)
    .single();

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: 'Unknown clinic' }, { status: 404 });
  }

  if (clinic.pms_type && clinic.pms_type !== 'jane') {
    // Don't reject — the webhook URL was opened by the clinic, they may be
    // mid-migration. Log it and move on.
    await markLog(clinicId, eventType, 'ignored', 'Clinic has different pms_type');
    return NextResponse.json({ received: true, ignored: true });
  }

  // 4. Extract + apply the event, catching per-event errors so the webhook
  //    still returns 200 to Jane. Errors surface in webhook_logs.processing_error.
  try {
    await processEvent({ clinicId, eventType, payload });
    await markLog(clinicId, eventType, 'processed');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[jane webhook]', clinicId, eventType, message);
    await markLog(clinicId, eventType, 'error', message);
  }

  return NextResponse.json({ received: true });
}

// ----------------------------------------------------------------------------
// Event router
// ----------------------------------------------------------------------------
async function processEvent(args: {
  clinicId: string;
  eventType: string | null;
  payload: Record<string, unknown>;
}) {
  const { clinicId, eventType, payload } = args;
  const appointment = extractAppointment(payload);
  if (!appointment) return; // Nothing we can do without an appointment block

  // Canonicalize the event into our internal status vocabulary
  const status = normalizeStatus(eventType, appointment.rawStatus);

  // Upsert patient (if we have any identifying info)
  const patientId = appointment.patient
    ? await upsertPatient(clinicId, appointment.patient)
    : null;

  // Upsert appointment
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';

  await db
    .from('appointments')
    .upsert(
      {
        clinic_id: clinicId,
        patient_id: patientId,
        pms_type: 'jane',
        pms_appointment_id: appointment.id,
        service: appointment.service ?? null,
        starts_at: appointment.startsAt ?? new Date().toISOString(),
        ends_at: appointment.endsAt ?? null,
        status,
        completed_at: isCompleted ? new Date().toISOString() : null,
        cancelled_at: isCancelled ? new Date().toISOString() : null,
        cancellation_reason: isCancelled ? appointment.cancellationReason ?? null : null,
        // review_request_enqueued stays false — the send-reviews cron picks up completions
      },
      { onConflict: 'pms_type,pms_appointment_id' },
    );
}

// ----------------------------------------------------------------------------
// Defensive extractors — read from multiple plausible paths
// ----------------------------------------------------------------------------
function extractEventType(payload: Record<string, unknown>): string | null {
  const candidates = [
    payload.event,
    payload.event_type,
    payload.type,
    (payload.data as { type?: unknown })?.type,
  ];
  for (const c of candidates) {
    if (typeof c === 'string') return c;
  }
  return null;
}

type ExtractedAppointment = {
  id: string;
  service?: string;
  startsAt?: string;
  endsAt?: string;
  rawStatus?: string;
  cancellationReason?: string;
  patient?: ExtractedPatient;
};

type ExtractedPatient = {
  name?: string;
  email?: string;
  phone?: string;
};

function extractAppointment(payload: Record<string, unknown>): ExtractedAppointment | null {
  const apt =
    getObj(payload, 'appointment') ??
    getObj(payload, 'data.appointment') ??
    getObj(payload, 'data') ??
    payload;

  const id = pickString(apt, ['id', 'appointment_id', 'uid', 'external_id']);
  if (!id) return null;

  const patientRaw =
    getObj(apt, 'patient') ??
    getObj(apt, 'client') ??
    getObj(apt, 'customer') ??
    getObj(payload, 'patient') ??
    getObj(payload, 'client');

  const patient: ExtractedPatient | undefined = patientRaw
    ? {
        name: pickString(patientRaw, ['name', 'full_name']) ??
          joinName(
            pickString(patientRaw, ['first_name', 'firstName']),
            pickString(patientRaw, ['last_name', 'lastName']),
          ),
        email: pickString(patientRaw, ['email', 'email_address']),
        phone: pickString(patientRaw, ['phone', 'phone_number', 'mobile', 'cell']),
      }
    : undefined;

  return {
    id,
    service:
      pickString(apt, ['service', 'service_name', 'treatment']) ??
      pickString(getObj(apt, 'service'), ['name']) ??
      undefined,
    startsAt: pickString(apt, ['starts_at', 'start_at', 'start_time', 'scheduled_at']),
    endsAt: pickString(apt, ['ends_at', 'end_at', 'end_time']),
    rawStatus: pickString(apt, ['status', 'state']),
    cancellationReason: pickString(apt, ['cancellation_reason', 'cancel_reason', 'reason']),
    patient,
  };
}

function normalizeStatus(eventType: string | null, rawStatus?: string): 'scheduled' | 'completed' | 'cancelled' | 'no_show' {
  const sig = `${eventType ?? ''} ${rawStatus ?? ''}`.toLowerCase();
  if (sig.includes('cancel')) return 'cancelled';
  if (sig.includes('complete') || sig.includes('finish') || sig.includes('arrived')) return 'completed';
  if (sig.includes('no_show') || sig.includes('no-show')) return 'no_show';
  return 'scheduled';
}

async function upsertPatient(clinicId: string, p: ExtractedPatient): Promise<string | null> {
  // Need at least one contact channel and a name for a meaningful patient row
  if (!p.name && !p.email && !p.phone) return null;

  // Try to match by email first, then phone, scoped to the clinic
  const matchCol = p.email ? 'email' : p.phone ? 'phone' : null;
  const matchVal = p.email ?? p.phone;

  if (matchCol && matchVal) {
    const { data: existing } = await db
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq(matchCol, matchVal)
      .limit(1)
      .maybeSingle();

    if (existing) return existing.id as string;
  }

  const { data: inserted, error } = await db
    .from('patients')
    .insert({
      clinic_id: clinicId,
      name: p.name ?? 'Unknown',
      email: p.email ?? null,
      phone: p.phone ?? null,
      consent_source: 'appointment', // Jane webhook = appointment-based consent
    })
    .select('id')
    .single();

  if (error) {
    console.error('[jane webhook] patient upsert failed:', error.message);
    return null;
  }
  return inserted?.id ?? null;
}

// ----------------------------------------------------------------------------
// HMAC signature verification
// ----------------------------------------------------------------------------
function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    if (sig.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------
async function markLog(
  clinicId: string,
  eventType: string | null,
  status: 'processed' | 'error' | 'ignored',
  processingError?: string,
) {
  await db
    .from('webhook_logs')
    .update({
      status,
      processed_at: new Date().toISOString(),
      processing_error: processingError ?? null,
    })
    .eq('clinic_id', clinicId)
    .eq('source', 'jane')
    .eq('event_type', eventType)
    .is('processed_at', null)
    .order('received_at', { ascending: false })
    .limit(1);
}

function getObj(o: unknown, path: string): Record<string, unknown> | null {
  const parts = path.split('.');
  let current: unknown = o;
  for (const p of parts) {
    if (current && typeof current === 'object' && p in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return current && typeof current === 'object' ? (current as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function joinName(first?: string, last?: string): string | undefined {
  const s = [first, last].filter(Boolean).join(' ').trim();
  return s || undefined;
}
