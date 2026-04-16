import Anthropic from '@anthropic-ai/sdk';
import type { NewsArticle } from './serper';

export interface ArticleWithAngle extends NewsArticle {
  summary: string;
  automationAngle: string;
}

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a product strategist at Optivio, a B2B SaaS company that builds workflow automations for medical spas.

Optivio's flagship product is ReviewFlow (post-treatment Google review requests). The team is actively expanding the catalog of sellable automations for med spa operators — patient retention, no-show recovery, lead follow-up, PMS integrations (Mindbody, Vagaro, Acuity), HIPAA-safe messaging, intake, marketing, and AI-assisted clinic operations.

Your job: given a news article from the med spa industry, produce two short pieces of content for an internal Notion idea database.

1. "Summary": one factual sentence describing what the article reports (no fluff, no hype words).
2. "Automation Angle": 1–2 sentences proposing a concrete, sellable Optivio automation that could be built off the trend or pain point in the article. Be specific about the trigger, the action, and which med spa role benefits. Avoid generic answers like "use AI to do X". If the article is not relevant to med spa operations, return automation angle "N/A — not med spa relevant".

Always respond with strict JSON matching:
{"summary": string, "automationAngle": string}
No markdown, no commentary, no code fences.`;

export async function generateAutomationAngle(
  client: Anthropic,
  article: NewsArticle
): Promise<{ summary: string; automationAngle: string }> {
  const userPrompt = `Title: ${article.title}
Source: ${article.source}
Date: ${article.date}
URL: ${article.link}

Snippet:
${article.snippet || '(no snippet)'}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';

  try {
    const parsed = JSON.parse(raw) as { summary?: string; automationAngle?: string };
    return {
      summary: parsed.summary ?? article.snippet,
      automationAngle: parsed.automationAngle ?? 'N/A — generation failed',
    };
  } catch {
    return {
      summary: article.snippet,
      automationAngle: `N/A — could not parse model output: ${raw.slice(0, 120)}`,
    };
  }
}

export async function annotateArticles(
  apiKey: string,
  articles: NewsArticle[]
): Promise<ArticleWithAngle[]> {
  const client = new Anthropic({ apiKey });
  const annotated: ArticleWithAngle[] = [];

  for (const article of articles) {
    const { summary, automationAngle } = await generateAutomationAngle(client, article);
    annotated.push({ ...article, summary, automationAngle });
  }

  return annotated;
}
