import type { ArticleWithAngle } from './automation-angle';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

interface NotionQueryResponse {
  results?: Array<{ id: string }>;
}

async function notionFetch(
  cfg: NotionConfig,
  path: string,
  init: RequestInit
): Promise<Response> {
  return fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export async function urlExistsInDatabase(
  cfg: NotionConfig,
  url: string
): Promise<boolean> {
  const res = await notionFetch(cfg, `/databases/${cfg.databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: 'Source', url: { equals: url } },
      page_size: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion dedupe query failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as NotionQueryResponse;
  return (data.results?.length ?? 0) > 0;
}

function toIsoDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

export async function appendArticle(
  cfg: NotionConfig,
  article: ArticleWithAngle
): Promise<void> {
  const res = await notionFetch(cfg, `/pages`, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: cfg.databaseId },
      properties: {
        Title: { title: [{ text: { content: article.title.slice(0, 1990) } }] },
        Source: { url: article.link },
        Date: { date: { start: toIsoDate(article.date) } },
        Summary: {
          rich_text: [{ text: { content: article.summary.slice(0, 1990) } }],
        },
        'Automation Angle': {
          rich_text: [{ text: { content: article.automationAngle.slice(0, 1990) } }],
        },
        Status: { select: { name: 'New' } },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion page create failed (${res.status}): ${body}`);
  }
}

export interface PushResult {
  inserted: number;
  skippedDuplicate: number;
  errors: string[];
}

export async function pushArticlesToNotion(
  cfg: NotionConfig,
  articles: ArticleWithAngle[]
): Promise<PushResult> {
  const result: PushResult = { inserted: 0, skippedDuplicate: 0, errors: [] };

  for (const article of articles) {
    try {
      if (await urlExistsInDatabase(cfg, article.link)) {
        result.skippedDuplicate++;
        continue;
      }
      await appendArticle(cfg, article);
      result.inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      result.errors.push(`${article.link}: ${msg}`);
    }
  }

  return result;
}
