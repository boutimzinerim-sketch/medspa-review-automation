import { NextRequest, NextResponse } from 'next/server';

let mockRules: Record<string, unknown>[] = [];
let nextId = 1;

export async function GET() {
  return NextResponse.json({ rules: mockRules, success: true });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', success: false }, { status: 400 });
  }

  const rule = { id: `rule-${nextId++}`, ...body, is_active: true, created_at: new Date().toISOString() };
  mockRules.unshift(rule);
  console.log('[POST /api/automations]', rule);

  return NextResponse.json({ data: rule, success: true }, { status: 201 });
}
