import twilio from 'twilio';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isBlocked, type BlocklistCheck } from '../compliance/blocklist';

// ============================================================================
// SMS sender (Twilio toll-free)
// ============================================================================
// Canadian toll-free SMS requires carrier-level TFV approval (2–4 weeks).
// Until TWILIO_TOLLFREE_VERIFIED=true is set, canSendToCa() returns false
// and senders should fall back to email. The code still RUNS end-to-end in
// dev — it just records message_sends.status='failed' with error_code='tfv_pending'
// so the cron knows to retry via email.
//
// `clinic.test_mode` redirects the send to the clinic owner's phone and
// skips the blocklist check.
// ============================================================================

export type ClinicSendCtx = {
  id: string;
  name: string;
  phone: string; // clinic owner's phone — used as reply-to and test_mode target
  sender_name?: string | null;
  test_mode?: boolean | null;
};

export type SendSmsInput = {
  clinic: ClinicSendCtx;
  patientId?: string | null;
  reviewRequestId?: string | null;
  to: string; // patient phone, E.164 preferred
  body: string;
};

export type SendSmsResult = {
  ok: boolean;
  messageSendId?: string;
  providerMessageId?: string;
  blocked?: boolean;
  /** True when the Canadian TFV gate is still pending — caller should fall back to email */
  requiresFallback?: boolean;
  error?: string;
};

export function canSendToCa(): boolean {
  return process.env.TWILIO_TOLLFREE_VERIFIED === 'true';
}

type TwilioClient = ReturnType<typeof twilio>;
let twilioClient: TwilioClient | null = null;
function twilioSdk(): TwilioClient {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error('[sms] TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
  }
  twilioClient = twilio(sid, token);
  return twilioClient;
}

let dbClient: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (dbClient) return dbClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('[sms] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  dbClient = createClient(url, key);
  return dbClient;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const { clinic, patientId, reviewRequestId, body } = input;
  const testMode = !!clinic.test_mode;
  const originalTo = normalizePhone(input.to);
  const actualTo = testMode ? normalizePhone(clinic.phone) : originalTo;

  if (!actualTo) {
    return { ok: false, error: 'No recipient phone' };
  }

  // 1. Blocklist check — skipped in test_mode
  let blocklistCheck: BlocklistCheck = {
    blocked: false,
    checkedAt: new Date().toISOString(),
  };
  if (!testMode) {
    blocklistCheck = await isBlocked({ clinicId: clinic.id, phone: originalTo });
  }

  // 2. Queue row
  const { data: queued, error: queueErr } = await db()
    .from('message_sends')
    .insert({
      clinic_id: clinic.id,
      patient_id: patientId ?? null,
      review_request_id: reviewRequestId ?? null,
      channel: 'sms',
      to_address: actualTo,
      body,
      status: 'queued',
      blocklist_checked_at: blocklistCheck.checkedAt,
      consent_verified: !blocklistCheck.blocked,
      test_mode: testMode,
    })
    .select('id')
    .single();

  if (queueErr || !queued) {
    return {
      ok: false,
      error: `Failed to queue message_send: ${queueErr?.message ?? 'unknown'}`,
    };
  }
  const messageSendId = queued.id as string;

  // 3. Carrier approval gate — bail early so caller can fall back to email
  if (!canSendToCa()) {
    await markFailed(messageSendId, 'tfv_pending', 'Twilio toll-free verification not yet approved');
    return {
      ok: false,
      messageSendId,
      requiresFallback: true,
      error: 'Twilio toll-free verification not yet approved',
    };
  }

  // 4. Short-circuit on block
  if (blocklistCheck.blocked) {
    await markFailed(messageSendId, 'blocklist', blocklistCheck.reason);
    return {
      ok: false,
      messageSendId,
      blocked: true,
      error: blocklistCheck.reason,
    };
  }

  // 5. Send
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!fromNumber) {
    await markFailed(messageSendId, 'config', 'TWILIO_FROM_NUMBER not set');
    return { ok: false, messageSendId, error: 'TWILIO_FROM_NUMBER not set' };
  }

  try {
    const msg = await twilioSdk().messages.create({
      from: fromNumber,
      to: actualTo,
      body,
    });

    if (msg.errorCode) {
      await markFailed(messageSendId, `twilio_${msg.errorCode}`, msg.errorMessage ?? 'Twilio error');
      return { ok: false, messageSendId, error: msg.errorMessage ?? undefined };
    }

    await db()
      .from('message_sends')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_message_id: msg.sid ?? null,
      })
      .eq('id', messageSendId);

    return { ok: true, messageSendId, providerMessageId: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await markFailed(messageSendId, 'exception', message);
    return { ok: false, messageSendId, error: message };
  }
}

async function markFailed(
  messageSendId: string,
  errorCode: string,
  errorMessage?: string,
): Promise<void> {
  await db()
    .from('message_sends')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_code: errorCode,
      error_message: errorMessage ?? null,
    })
    .eq('id', messageSendId);
}

function normalizePhone(v: string | null | undefined): string {
  if (!v) return '';
  const cleaned = v.trim().replace(/[^\d+]/g, '');
  return cleaned;
}
