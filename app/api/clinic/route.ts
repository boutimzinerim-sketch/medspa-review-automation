import { NextResponse } from 'next/server';
import { getUser, getClinicForUser, ensureClinic } from '@/lib/auth';

// GET /api/clinic — returns current user's clinic
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clinic = await getClinicForUser(user.id);
  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });

  return NextResponse.json(clinic);
}

// POST /api/clinic — creates clinic if doesn't exist, returns it
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const clinic = await ensureClinic(user.id, user.email);
    return NextResponse.json(clinic, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create clinic' },
      { status: 500 }
    );
  }
}
