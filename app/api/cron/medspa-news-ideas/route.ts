import { NextRequest, NextResponse } from 'next/server';
import { runMedSpaNewsPipeline } from '@/lib/medspa-news/pipeline';

export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization');
  return header === `Bearer ${expected}`;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const missing: string[] = [];
  if (!process.env.SERPER_API_KEY) missing.push('SERPER_API_KEY');
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.NOTION_API_KEY) missing.push('NOTION_API_KEY');
  if (!process.env.NOTION_MEDSPA_IDEAS_DB_ID) missing.push('NOTION_MEDSPA_IDEAS_DB_ID');
  if (missing.length) {
    return NextResponse.json(
      { error: 'Missing environment variables', missing },
      { status: 500 }
    );
  }

  try {
    const result = await runMedSpaNewsPipeline({
      serperApiKey: process.env.SERPER_API_KEY!,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
      notionApiKey: process.env.NOTION_API_KEY!,
      notionDatabaseId: process.env.NOTION_MEDSPA_IDEAS_DB_ID!,
    });

    console.log('[CRON medspa-news-ideas]', result);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON medspa-news-ideas] failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
