import { NextRequest, NextResponse } from 'next/server';
import { getPMSIntegration } from '@/lib/pms-integrations/manager';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pmsType: string }> }
) {
  const { pmsType } = await params;

  let body: { clinicId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { clinicId } = body;
  if (!clinicId) {
    return NextResponse.json({ error: 'clinicId is required' }, { status: 400 });
  }

  try {
    const integration = getPMSIntegration(pmsType);
    const url = integration.getAuthUrl(clinicId);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate auth URL' },
      { status: 400 }
    );
  }
}
