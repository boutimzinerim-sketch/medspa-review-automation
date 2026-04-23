import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, type ClinicSendCtx as EmailClinicCtx } from '@/lib/senders/email';
import { sendSms, canSendToCa, type ClinicSendCtx as SmsClinicCtx } from '@/lib/senders/sms';
import { renderReviewRequestEmail } from '@/lib/templates/review-request-email';
import { renderReviewRequestSms } from '@/lib/templates/review-request-sms';

// ============================================================================
// Review-request cron — /api/cron/send-review-requests
// ============================================================================
// Triggered by Vercel Cron every 5 minutes (see vercel.json).
//
// For each appointment that:
//   - status = 'completed'
//   - review_request_enqueued = false
//   - completed_at + (rule.days_after_appointment) is in the past
//
// Creates a review_requests row, renders the FR template, dispatches via
// the clinic's preferred channel. SMS auto-falls-back to email until Twilio
// toll-free carrier approval lands.
//
// Security: Authorization: Bearer ${CRON_SECRET}. Vercel Cron sends this header
// automatically when the job is defined in vercel.json.
// ============================================================================

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  service: string | null;
  completed_at: string | null;
};

type Clinic = {
  id: string;
  name: string;
  email: string;
  phone: string;
  sender_name: string | null;
  test_mode: boolean;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
};

type Patient = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type Rule = {
  id: string;
  channel: 'email' | 'sms';
  days_after_appointment: number;
};

type DispatchResult = {
  appointmentId: string;
  status: 'sent' | 'skipped' | 'failed' | 'too_soon';
  channelAttempted?: 'email' | 'sms';
  channelUsed?: 'email' | 'sms';
  error?: string;
  reviewRequestId?: string;
  messageSendId?: string;
};

async function handler(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: DispatchResult[] = [];
  const startedAt = new Date().toISOString();

  try {
    const { data: candidates, error: candErr } = await db
      .from('appointments')
      .select('id, clinic_id, patient_id, service, completed_at')
      .eq('status', 'completed')
      .eq('review_request_enqueued', false)
      .not('completed_at', 'is', null)
      .not('patient_id', 'is', null)
      .limit(200);

    if (candErr) {
      console.error('[cron:reviews] candidate query failed:', candErr.message);
      return NextResponse.json({ error: candErr.message }, { status: 500 });
    }

    for (const apt of (candidates ?? []) as Appointment[]) {
      try {
        const result = await processOne(apt);
        results.push(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[cron:reviews]', apt.id, message);
        results.push({ appointmentId: apt.id, status: 'failed', error: message });
      }
    }

    const summary = results.reduce(
      (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
      {} as Record<string, number>,
    );

    return NextResponse.json({
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      processed: results.length,
      summary,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron:reviews] fatal:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Next.js App Router: Vercel Cron by default issues GET; we accept both so
// manual POST from curl also works.
export const GET = handler;
export const POST = handler;

// ----------------------------------------------------------------------------
// Per-appointment pipeline
// ----------------------------------------------------------------------------
async function processOne(apt: Appointment): Promise<DispatchResult> {
  if (!apt.completed_at || !apt.patient_id) {
    return { appointmentId: apt.id, status: 'skipped', error: 'Missing completed_at or patient_id' };
  }

  // Resolve the automation rule (by service, with fallback to clinic default)
  const rule = await resolveRule(apt.clinic_id, apt.service);
  const waitDays = rule?.days_after_appointment ?? 2;
  const sendDueAt = new Date(apt.completed_at).getTime() + waitDays * 86_400_000;
  if (Date.now() < sendDueAt) {
    return { appointmentId: apt.id, status: 'too_soon' };
  }

  // Fetch clinic + patient
  const [clinic, patient] = await Promise.all([
    fetchClinic(apt.clinic_id),
    fetchPatient(apt.patient_id),
  ]);
  if (!clinic) {
    return { appointmentId: apt.id, status: 'skipped', error: 'Clinic not found' };
  }
  if (!patient) {
    return { appointmentId: apt.id, status: 'skipped', error: 'Patient not found' };
  }

  const channelPreferred: 'email' | 'sms' = rule?.channel ?? 'email';

  // Create review_request row up-front; its id serves as the magic-link token.
  const { data: rr, error: rrErr } = await db
    .from('review_requests')
    .insert({
      clinic_id: clinic.id,
      patient_id: patient.id,
      appointment_id: apt.id,
      automation_rule_id: rule?.id ?? null,
      channel: channelPreferred,
      sent_at: new Date().toISOString(),
      response_status: 'pending',
    })
    .select('id')
    .single();

  if (rrErr || !rr) {
    return {
      appointmentId: apt.id,
      status: 'failed',
      error: `review_requests insert failed: ${rrErr?.message ?? 'unknown'}`,
    };
  }
  const reviewRequestId = rr.id as string;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://epidou-landing.vercel.app';
  const magicLinkUrl = `${siteUrl.replace(/\/$/, '')}/r/${reviewRequestId}`;

  // Attempt delivery. SMS may fall back to email when TFV not yet approved.
  let channelUsed: 'email' | 'sms' | undefined;
  let sendOk = false;
  let lastError: string | undefined;
  let messageSendId: string | undefined;

  const trySms = channelPreferred === 'sms' && !!patient.phone && canSendToCa();
  if (trySms) {
    const { body } = renderReviewRequestSms({
      clinicName: clinic.name,
      patientFirstName: firstName(patient.name) ?? '',
      magicLinkUrl,
    });
    const res = await sendSms({
      clinic: toSmsCtx(clinic),
      patientId: patient.id,
      reviewRequestId,
      to: patient.phone!,
      body,
    });
    sendOk = res.ok;
    channelUsed = 'sms';
    messageSendId = res.messageSendId;
    lastError = res.error;

    if (!res.ok && res.requiresFallback) {
      channelUsed = undefined;
      sendOk = false;
    }
  }

  if (!sendOk && patient.email) {
    const { subject, html, text } = renderReviewRequestEmail({
      clinicName: clinic.name,
      clinicAddress: formatAddress(clinic),
      patientFirstName: firstName(patient.name) ?? '',
      magicLinkUrl,
      unsubscribeUrl: `mailto:${clinic.email}?subject=${encodeURIComponent('Se désabonner')}`,
    });
    const res = await sendEmail({
      clinic: toEmailCtx(clinic),
      patientId: patient.id,
      reviewRequestId,
      to: patient.email,
      subject,
      html,
      text,
      unsubscribeMailto: clinic.email,
    });
    sendOk = res.ok;
    channelUsed = 'email';
    messageSendId = res.messageSendId;
    lastError = res.error;
  }

  // Persist dispatch outcome on the review_request + mark the appointment
  await db
    .from('review_requests')
    .update({ review_link_sent: magicLinkUrl, channel: channelUsed ?? channelPreferred })
    .eq('id', reviewRequestId);

  if (sendOk) {
    await db
      .from('appointments')
      .update({
        review_request_enqueued: true,
        review_request_enqueued_at: new Date().toISOString(),
      })
      .eq('id', apt.id);
  }

  return {
    appointmentId: apt.id,
    status: sendOk ? 'sent' : 'failed',
    channelAttempted: channelPreferred,
    channelUsed,
    error: sendOk ? undefined : lastError ?? 'No viable channel (missing email/phone)',
    reviewRequestId,
    messageSendId,
  };
}

// ----------------------------------------------------------------------------
// Data access helpers
// ----------------------------------------------------------------------------
async function resolveRule(clinicId: string, service: string | null): Promise<Rule | null> {
  const query = db
    .from('automation_rules')
    .select('id, channel, days_after_appointment')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  if (service) query.eq('service_type', service);

  const { data } = await query.maybeSingle();
  if (data) return data as Rule;

  if (service) {
    const { data: fallback } = await db
      .from('automation_rules')
      .select('id, channel, days_after_appointment')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    return (fallback as Rule | null) ?? null;
  }
  return null;
}

async function fetchClinic(clinicId: string): Promise<Clinic | null> {
  const { data } = await db
    .from('clinics')
    .select(
      'id, name, email, phone, sender_name, test_mode, address_line1, address_line2, city, province, postal_code',
    )
    .eq('id', clinicId)
    .maybeSingle();
  return (data as Clinic | null) ?? null;
}

async function fetchPatient(patientId: string): Promise<Patient | null> {
  const { data } = await db
    .from('patients')
    .select('id, name, email, phone')
    .eq('id', patientId)
    .maybeSingle();
  return (data as Patient | null) ?? null;
}

function toEmailCtx(c: Clinic): EmailClinicCtx {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    sender_name: c.sender_name,
    test_mode: c.test_mode,
  };
}

function toSmsCtx(c: Clinic): SmsClinicCtx {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    sender_name: c.sender_name,
    test_mode: c.test_mode,
  };
}

function firstName(full: string | null | undefined): string | undefined {
  if (!full) return undefined;
  const first = full.trim().split(/\s+/)[0];
  return first || undefined;
}

function formatAddress(c: Clinic): string {
  const parts = [c.address_line1, c.address_line2, c.city, c.province, c.postal_code].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : c.name;
}
