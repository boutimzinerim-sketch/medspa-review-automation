// One-shot endpoint to populate the demo clinic with sample data.
// Safe to call repeatedly — seedClinicData() short-circuits if patients already exist.

import { NextResponse } from 'next/server';
import { getDemoClinicId, ensureDemoSeeded } from '@/lib/demo-clinic';

export async function POST() {
  try {
    const clinicId = await getDemoClinicId();
    await ensureDemoSeeded(clinicId);
    return NextResponse.json({ ok: true, clinicId });
  } catch (err) {
    console.error('[POST /api/admin/seed] error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
