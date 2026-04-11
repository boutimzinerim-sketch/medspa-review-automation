import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPMSIntegration } from '@/lib/pms-integrations/manager';
import { encrypt } from '@/lib/encryption';
import { syncAppointmentsFromPMS } from '@/lib/appointment-sync';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pmsType: string }> }
) {
  const { pmsType } = await params;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const clinicId = url.searchParams.get('state');

  if (!code || !clinicId) {
    return NextResponse.redirect(new URL('/dashboard/setup?error=missing_params', req.url));
  }

  try {
    const integration = getPMSIntegration(pmsType);
    const tokens = await integration.getAccessToken(clinicId, code);

    const pmsClinicId = url.searchParams.get('clinic_id') ?? url.searchParams.get('subscriberId') ?? clinicId;

    // Store encrypted tokens
    const { error: updateErr } = await db
      .from('clinics')
      .update({
        pms_type: pmsType,
        pms_access_token: encrypt(tokens.access_token),
        pms_refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        pms_clinic_id: pmsClinicId,
      })
      .eq('id', clinicId);

    if (updateErr) {
      console.error('[PMS callback] DB update error:', updateErr.message);
      return NextResponse.redirect(new URL('/dashboard/setup?error=db_error', req.url));
    }

    // Trigger initial sync
    try {
      const result = await syncAppointmentsFromPMS(clinicId);
      console.log(`[PMS callback] Initial sync: ${result.inserted} appointments imported`);
    } catch (syncErr) {
      console.error('[PMS callback] Initial sync error:', syncErr);
      // Don't block — connection succeeded even if sync failed
    }

    return NextResponse.redirect(new URL('/dashboard?pms_connected=true', req.url));
  } catch (err) {
    console.error('[PMS callback] error:', err);
    return NextResponse.redirect(new URL(`/dashboard/setup?error=auth_failed&pms=${pmsType}`, req.url));
  }
}
