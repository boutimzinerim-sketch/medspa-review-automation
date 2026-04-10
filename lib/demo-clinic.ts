import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEMO_EMAIL = 'test@medspa.com';

let cachedId = '';

// Returns a real clinic UUID — creates the row on first call
export async function getDemoClinicId(): Promise<string> {
  if (cachedId.length > 0) return cachedId;

  // Try to find existing
  const { data } = await db
    .from('clinics')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .single();

  if (data) {
    cachedId = data.id;
    return cachedId;
  }

  // Create it
  const { data: created, error } = await db
    .from('clinics')
    .insert({ name: 'My Med Spa', email: DEMO_EMAIL, user_id: DEMO_EMAIL })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create demo clinic: ${error.message}`);

  cachedId = created.id;
  return cachedId;
}
