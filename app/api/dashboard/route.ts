import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard-aggregator';
import { getDemoClinicId } from '@/lib/demo-clinic';

export async function GET() {
  try {
    const clinicId = await getDemoClinicId();
    const payload = await getDashboardData(clinicId);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[GET /api/dashboard] error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
