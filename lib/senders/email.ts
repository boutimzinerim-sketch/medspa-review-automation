import { Resend } from 'resend';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isBlocked, type BlocklistCheck } from '../compliance/blocklist';

// ============================================================================
// Email sender (Resend)
// ============================================================================
// Transport layer: accepts a pre-rendered subject/html/text, runs the CASL
// blocklist gate, queues a message_sends row, dispatches via Resend, and
// updates the row with the result.
//
// `clinic.test_mode` redirects the send to the clinic owner's own inbox and
// skips the blocklist check (dev/demo tool). The original recipient is NOT
// persisted in that case — message_sends.to_address is the actual sent-to.
// ============================================================================

export type ClinicSendCtx = {
  id: string;
  name: string;
  email: string;
  sender_name?: string | null;
  test_mode?: boolean | null;
};

export type SendEmailInput = {
  clinic: ClinicSendCtx;
  patientId?: string | null;
  reviewRequestId?: string | null;
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** mailto target (without the mailto: prefix) used for List-Unsubscribe header */
  unsubscribeMailto?: string;
};

export type SendEmailResult = {
  ok: boolean;
  messageSendId?: string;
  providerMessageId?: string;
  blocked?: boolean;
  error?: string;
};

let resendClient: Resend | null = null;
function resend(): Resend {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('[email] RESEND_API_KEY is required');
  resendClient = new Resend(key);
  return resendClient;
}

let dbClient: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (dbClient) return dbClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('[email] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  dbClient = createClient(url, key);
  return dbClient;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { clinic, patientId, reviewRequestId, subject, html, text } = input;
  const testMode = !!clinic.test_mode;
  const originalTo = input.to.trim().toLowerCase();
  const actualTo = testMode ? clinic.email.trim().toLowerCase() : originalTo;

  if (!actualTo) {
    return { ok: false, error: 'No recipient address' };
  }

  // 1. Blocklist check — skipped in test_mode
  let blocklistCheck: BlocklistCheck = {
    blocked: false,
    checkedAt: new Date().toISOString(),
  };
  if (!testMode) {
    blocklistCheck = await isBlocked({ clinicId: clinic.id, email: originalTo });
  }

  // 2. Queue row (always — observability even for blocked/failed)
  const bodyForLog = text ?? stripHtml(html);
  const { data: queued, error: queueErr } = await db()
    .from('message_sends')
    .insert({
      clinic_id: clinic.id,
      patient_id: patientId ?? null,
      review_request_id: reviewRequestId ?? null,
      channel: 'email',
      to_address: actualTo,
      body: bodyForLog,
      subject,
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

  // 3. Short-circuit on block
  if (blocklistCheck.blocked) {
    await markFailed(messageSendId, 'blocklist', blocklistCheck.reason);
    return {
      ok: false,
      messageSendId,
      blocked: true,
      error: blocklistCheck.reason,
    };
  }

  // 4. Resolve FROM + reply-to + headers
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const fromNameRaw = (clinic.sender_name ?? clinic.name ?? 'Clinic').trim();
  const fromName = fromNameRaw.replace(/[<>"]/g, '') || 'Clinic';
  const from = `${fromName} <${fromEmail}>`;
  const replyTo = clinic.email?.trim() || fromEmail;

  const headers: Record<string, string> = {};
  if (input.unsubscribeMailto) {
    headers['List-Unsubscribe'] = `<mailto:${input.unsubscribeMailto}>`;
  }

  // 5. Send
  try {
    const resp = await resend().emails.send({
      from,
      to: actualTo,
      replyTo,
      subject,
      html,
      text,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (resp.error) {
      await markFailed(messageSendId, resp.error.name ?? 'resend_error', resp.error.message);
      return { ok: false, messageSendId, error: resp.error.message };
    }

    const providerMessageId = resp.data?.id;
    await db()
      .from('message_sends')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_message_id: providerMessageId ?? null,
      })
      .eq('id', messageSendId);

    return { ok: true, messageSendId, providerMessageId };
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

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
