import { createClient } from '@supabase/supabase-js';
import { getPMSIntegration } from './pms-integrations/manager';
import { getReviewRequestDate } from './review-timing';
import { decrypt } from './encryption';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SyncResult {
  inserted: number;
  skipped: number;
  total: number;
  errors: string[];
}

export async function syncAppointmentsFromPMS(clinicId: string): Promise<SyncResult> {
  console.log(`[SYNC] Starting sync for clinic ${clinicId}`);

  const { data: clinic, error: clinicError } = await db
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .single();

  if (clinicError || !clinic) throw new Error('Clinic not found');
  if (!clinic.pms_type) throw new Error('No PMS connected');
  if (!clinic.pms_access_token) throw new Error('No PMS access token');

  const integration = getPMSIntegration(clinic.pms_type);

  let accessToken: string;
  try {
    accessToken = decrypt(clinic.pms_access_token);
  } catch {
    throw new Error('Failed to decrypt PMS access token');
  }

  // Fetch from PMS
  const appointments = await integration.getAppointments(
    accessToken,
    clinic.pms_clinic_id ?? clinicId,
    30
  );

  console.log(`[SYNC] Fetched ${appointments.length} appointments from ${clinic.pms_type}`);

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const apt of appointments) {
    if (!apt.patientEmail) {
      skipped++;
      continue;
    }

    // Check if already synced (upsert pattern)
    const { data: existing } = await db
      .from('appointments')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('pms_appointment_id', apt.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Insert appointment
    const { data: newApt, error: insertErr } = await db
      .from('appointments')
      .insert({
        clinic_id: clinicId,
        pms_appointment_id: apt.id,
        patient_name: apt.patientName,
        patient_email: apt.patientEmail,
        service_type: apt.serviceType,
        appointment_date: apt.appointmentDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (insertErr) {
      errors.push(`Failed to insert appointment ${apt.id}: ${insertErr.message}`);
      continue;
    }

    inserted++;

    // Schedule review request
    const reviewDate = getReviewRequestDate(apt.appointmentDate, apt.serviceType);
    if (reviewDate && newApt) {
      await db.from('review_automation_logs').insert({
        appointment_id: newApt.id,
        scheduled_send_date: reviewDate.toISOString().split('T')[0],
      });
    }
  }

  // Update last sync timestamp
  await db
    .from('clinics')
    .update({ last_pms_sync: new Date().toISOString() })
    .eq('id', clinicId);

  console.log(`[SYNC] Done. Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors.length}`);

  return { inserted, skipped, total: appointments.length, errors };
}
