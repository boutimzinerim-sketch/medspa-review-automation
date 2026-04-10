import { NextResponse } from 'next/server';
import { getUser, ensureClinic } from '@/lib/auth';
import { seedClinicData } from '@/lib/seed';

// Called after signup — creates clinic + seeds demo data
export async function POST() {
  const user = await getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const clinic = await ensureClinic(user.id, user.email);

    // Seed demo data for new clinics
    const seeded = await seedClinicData(clinic.id);

    return NextResponse.json({
      clinic_id: clinic.id,
      seeded,
    });
  } catch (err) {
    console.error('[auth/setup] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed' },
      { status: 500 }
    );
  }
}
