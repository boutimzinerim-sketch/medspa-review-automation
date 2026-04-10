import { NextRequest, NextResponse } from 'next/server';

let mockPatients: Record<string, unknown>[] = [];
let nextId = 1;

export async function GET() {
  return NextResponse.json({ data: mockPatients, success: true });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', success: false }, { status: 400 });
  }

  const patient = { id: `demo-${nextId++}`, ...body, reviewed: false, created_at: new Date().toISOString() };
  mockPatients.unshift(patient);
  console.log('[POST /api/patients]', patient);

  return NextResponse.json({ data: patient, success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  mockPatients = mockPatients.filter((p) => p.id !== id);
  return NextResponse.json({ success: true });
}
