import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncAppointmentsFromPMS } from '@/lib/appointment-sync';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: { clinicId: string; status: string; inserted?: number; error?: string }[] = [];

  try {
    // Get all clinics with PMS connected
    const { data: clinics } = await db
      .from('clinics')
      .select('id, pms_type, name')
      .not('pms_type', 'is', null);

    for (const clinic of clinics ?? []) {
      try {
        const result = await syncAppointmentsFromPMS(clinic.id);
        results.push({ clinicId: clinic.id, status: 'ok', inserted: result.inserted });
        console.log(`[CRON] ${clinic.name}: +${result.inserted} appointments`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ clinicId: clinic.id, status: 'error', error: msg });
        console.error(`[CRON] ${clinic.name} failed:`, msg);
      }
    }

    const totalInserted = results.reduce((sum, r) => sum + (r.inserted ?? 0), 0);

    return NextResponse.json({
      success: true,
      clinicsSynced: results.length,
      totalInserted,
      results,
    });
  } catch (err) {
    console.error('[CRON] Fatal error:', err);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
