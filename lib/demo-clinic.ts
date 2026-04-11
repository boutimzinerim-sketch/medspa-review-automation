import { createClient } from '@supabase/supabase-js';
import { seedClinicData } from './seed';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DEMO_EMAIL = 'demo@reviewflow.local';

let cachedId = '';

// Returns a real clinic UUID. Strategy:
// 1. Cached id if already resolved this process
// 2. Existing clinic by demo email
// 3. Any existing clinic (any clinic works for the demo)
// 4. Provision a brand-new auth user via the admin API and create a clinic
async function findOrCreateAuthUser(): Promise<string> {
  // Try to find an existing auth user with the demo email
  const list = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = list.data.users.find((u) => u.email === DEMO_EMAIL);
  if (found) return found.id;

  const created = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(`Failed to create demo auth user: ${created.error?.message ?? 'unknown'}`);
  }
  return created.data.user.id;
}

export async function getDemoClinicId(): Promise<string> {
  if (cachedId.length > 0) return cachedId;

  const byEmail = await db
    .from('clinics')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle();
  if (byEmail.data?.id) {
    cachedId = byEmail.data.id;
    return cachedId;
  }

  const anyClinic = await db.from('clinics').select('id').limit(1).maybeSingle();
  if (anyClinic.data?.id) {
    cachedId = anyClinic.data.id;
    return cachedId;
  }

  // Provision auth user, then clinic
  const userId = await findOrCreateAuthUser();
  const { data: created, error } = await db
    .from('clinics')
    .insert({ name: 'My Med Spa', email: DEMO_EMAIL, user_id: userId })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create demo clinic: ${error.message}`);

  cachedId = created.id;

  // Auto-seed demo data on first creation so the dashboard looks populated
  try {
    await seedClinicData(cachedId);
  } catch (seedErr) {
    console.error('[demo-clinic] seed error (non-fatal):', seedErr);
  }

  return cachedId;
}

// Force-seed an existing clinic. Call this from a one-shot route if you want
// to populate a clinic that was created without going through getDemoClinicId.
export async function ensureDemoSeeded(clinicId: string) {
  await seedClinicData(clinicId);
}
