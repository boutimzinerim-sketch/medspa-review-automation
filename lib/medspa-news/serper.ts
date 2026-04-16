export interface NewsArticle {
  title: string;
  link: string;
  snippet: string;
  source: string;
  date: string;
  imageUrl?: string;
}

interface SerperNewsItem {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
  date?: string;
  imageUrl?: string;
}

interface SerperNewsResponse {
  news?: SerperNewsItem[];
}

export const MEDSPA_NEWS_QUERIES = [
  'med spa operations',
  'med spa patient retention',
  'med spa marketing',
  'med spa no-show appointments',
  'Mindbody med spa software',
  'Vagaro aesthetic clinic',
  'Acuity Scheduling clinic',
  'aesthetic clinic AI',
  'medical spa lead follow up',
  'HIPAA workflow clinic automation',
];

const SERPER_NEWS_ENDPOINT = 'https://google.serper.dev/news';

export async function searchMedSpaNews(
  apiKey: string,
  queries: string[] = MEDSPA_NEWS_QUERIES,
  perQuery = 10
): Promise<NewsArticle[]> {
  const results: NewsArticle[] = [];

  for (const q of queries) {
    const res = await fetch(SERPER_NEWS_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q, num: perQuery, tbs: 'qdr:d' }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Serper request failed for "${q}" (${res.status}): ${body}`);
    }

    const data = (await res.json()) as SerperNewsResponse;

    for (const item of data.news ?? []) {
      if (!item.link || !item.title) continue;
      results.push({
        title: item.title,
        link: item.link,
        snippet: item.snippet ?? '',
        source: item.source ?? new URL(item.link).hostname,
        date: item.date ?? '',
        imageUrl: item.imageUrl,
      });
    }
  }

  // Dedupe by URL within this batch (Notion-side dedupe still required across runs)
  const seen = new Set<string>();
  return results.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });
}
