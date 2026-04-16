import { searchMedSpaNews, MEDSPA_NEWS_QUERIES, type NewsArticle } from './serper';
import { annotateArticles } from './automation-angle';
import { pushArticlesToNotion, urlExistsInDatabase, type PushResult } from './notion';

export interface PipelineConfig {
  serperApiKey: string;
  anthropicApiKey: string;
  notionApiKey: string;
  notionDatabaseId: string;
  queries?: string[];
  perQuery?: number;
}

export interface PipelineResult {
  fetched: number;
  newAfterDedupe: number;
  annotated: number;
  push: PushResult;
}

export async function runMedSpaNewsPipeline(
  cfg: PipelineConfig
): Promise<PipelineResult> {
  const articles = await searchMedSpaNews(
    cfg.serperApiKey,
    cfg.queries ?? MEDSPA_NEWS_QUERIES,
    cfg.perQuery ?? 10
  );

  // Pre-filter against Notion to avoid spending Claude tokens on duplicates.
  const notionCfg = {
    apiKey: cfg.notionApiKey,
    databaseId: cfg.notionDatabaseId,
  };

  const fresh: NewsArticle[] = [];
  for (const article of articles) {
    if (await urlExistsInDatabase(notionCfg, article.link)) continue;
    fresh.push(article);
  }

  const annotated = await annotateArticles(cfg.anthropicApiKey, fresh);
  const push = await pushArticlesToNotion(notionCfg, annotated);

  return {
    fetched: articles.length,
    newAfterDedupe: fresh.length,
    annotated: annotated.length,
    push,
  };
}
