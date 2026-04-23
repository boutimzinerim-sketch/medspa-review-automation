import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { addToBlocklist } from '@/lib/compliance/blocklist';

// ============================================================================
// Twilio inbound SMS webhook — STOP handler
// ============================================================================
// Toll-free carriers intercept STOP natively, but we still receive the event
// and must (a) persist our own blocklist row and (b) reply with a branded
// confirmation in French + English.
//
// Since our sending number is shared across clinics, STOP is attributed to
// the clinic that most recently messaged the sender — CASL-correct (opt-out
// is sender-specific) and the pragmatic choice for a shared short/toll-free
// number model.
//
// Validation: TWILIO_VALIDATE_WEBHOOK=true enables X-Twilio-Signature check.
// Leave off during initial Twilio webhook URL testing, flip on for production.
// ============================================================================

const STOP_KEYWORDS = [
  'stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit',
  'arret', 'arrêt', 'arreter', 'arrêter',
  'desabonner', 'désabonner', 'desinscrire', 'désinscrire',
];

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // Signature validation (opt-in via env flag)
  if (process.env.TWILIO_VALIDATE_WEBHOOK === 'true') {
    const signature = req.headers.get('x-twilio-signature');
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!signature || !authToken) {
      return new NextResponse('Missing signature or config', { status: 403 });
    }
    const fullUrl = buildValidationUrl(req);
    const ok = twilio.validateRequest(authToken, signature, fullUrl, params as Record<string, string>);
    if (!ok) return new NextResponse('Invalid signature', { status: 403 });
  }

  const body = String(params.Body ?? '').trim();
  const from = normalizePhone(String(params.From ?? ''));
  const to = normalizePhone(String(params.To ?? ''));

  // Always log the inbound to webhook_logs for observability.
  // webhook_logs.source is a pms_type enum which doesn't include 'twilio', so
  // we skip this for now and rely on message_sends + direct logging.
  console.log('[twilio:inbound]', { from, to, bodyPreview: body.slice(0, 80) });

  if (!from) return twiml('');

  if (isStopKeyword(body)) {
    const clinicId = await resolveClinicForPhone(from);
    if (clinicId) {
      try {
        await addToBlocklist({
          clinicId,
          phone: from,
          source: 'sms_stop',
          reason: `SMS STOP: "${body.slice(0, 100)}"`,
        });
      } catch (err) {
        console.error('[twilio:inbound] blocklist add failed:', err);
      }
    } else {
      console.warn('[twilio:inbound] STOP received from unmatched number', from);
    }

    return twiml(
      "Vous êtes désinscrit. You've been unsubscribed. Répondez START pour vous réinscrire / Reply START to resubscribe.",
    );
  }

  // Non-STOP inbound: do nothing. Future: route to clinic's inbox.
  return twiml('');
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function isStopKeyword(body: string): boolean {
  if (!body) return false;
  const lower = body.toLowerCase().trim();
  const firstWord = lower.split(/[\s,.!?]+/)[0];
  return STOP_KEYWORDS.includes(firstWord);
}

async function resolveClinicForPhone(phone: string): Promise<string | null> {
  // Attribute to whichever clinic most recently messaged this number.
  const { data } = await db
    .from('message_sends')
    .select('clinic_id')
    .eq('to_address', phone)
    .eq('channel', 'sms')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.clinic_id as string | undefined) ?? null;
}

function buildValidationUrl(req: NextRequest): string {
  // Twilio signs the exact URL it POSTed to. When running behind a proxy
  // (Vercel), req.url may be the internal URL — prefer x-forwarded-host.
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${req.nextUrl.pathname}${req.nextUrl.search}`;
  }
  return req.url;
}

function twiml(message: string): NextResponse {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizePhone(v: string): string {
  return v.trim().replace(/[^\d+]/g, '');
}
