import { NextRequest, NextResponse } from 'next/server';
import { getUser, getClinicForUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clinic = await getClinicForUser(user.id);
  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file || !file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'Please upload a .csv file' }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.trim().split('\n');

  if (lines.length < 2) {
    return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const nameIdx = headers.indexOf('name');
  const emailIdx = headers.indexOf('email');
  const phoneIdx = headers.indexOf('phone');
  const serviceIdx = headers.findIndex((h) => h.includes('service'));
  const dateIdx = headers.findIndex((h) => h.includes('date'));

  if (nameIdx === -1 || emailIdx === -1) {
    return NextResponse.json(
      { error: 'CSV must have "name" and "email" columns' },
      { status: 400 }
    );
  }

  const rows: Record<string, unknown>[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
    const name = cols[nameIdx];
    const email = cols[emailIdx];

    if (!name || !email) {
      errors.push({ row: i + 1, reason: 'Missing name or email' });
      continue;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: i + 1, reason: `Invalid email: ${email}` });
      continue;
    }

    rows.push({
      clinic_id: clinic.id,
      name,
      email: email.toLowerCase(),
      phone: phoneIdx >= 0 ? (cols[phoneIdx] ?? '') : '',
      last_service: serviceIdx >= 0 ? (cols[serviceIdx] ?? 'Other') : 'Other',
      appointment_date: dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().split('T')[0],
      reviewed: false,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      success: false,
      imported: 0,
      errors,
      message: 'No valid rows found',
    }, { status: 400 });
  }

  const { error } = await db.from('patients').insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    imported: rows.length,
    errors,
    message: `Successfully imported ${rows.length} patient${rows.length === 1 ? '' : 's'}`,
  });
}
