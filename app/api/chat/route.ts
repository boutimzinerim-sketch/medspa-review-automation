// ============================================================
// /api/chat — Streaming chat endpoint backed by Claude
// Two modes:
//   1. POST with { suggestionId } → returns a hardcoded canned
//      response as a stream (deterministic, demo-safe)
//   2. POST with { message } → free-text, streams from Claude
//      with a system prompt grounded in the clinic's real stats
// ============================================================

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDashboardData } from '@/lib/dashboard-aggregator';
import { getDemoClinicId } from '@/lib/demo-clinic';

export const runtime = 'nodejs';

const CANNED_RESPONSES: Record<string, string> = {
  'pending-reviews':
    "You currently have 15 pending review requests waiting for a response. Most of them are from patients who completed treatments in the last 7 days — that's the sweet spot, so I'd reach out tonight. Want me to draft a friendly nudge?",
  'compare-week-vs-month':
    "This week you've collected 12 new 5-star reviews versus 9 last week — that's a 33% lift. Compared to your trailing 30-day average, you're trending 18% above baseline. Hydrafacial and Botox are doing the heavy lifting.",
  'top-services':
    "Your top three services by review volume right now: Hydrafacial (38%), Botox (24%), and Microneedling (16%). Hydrafacial reviews score the highest sentiment (9.4 / 10) and almost always mention 'glow' or 'results'.",
};

function streamCannedResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Stream word-by-word for that real "typing" feel
      const words = text.split(' ');
      for (const word of words) {
        controller.enqueue(encoder.encode(word + ' '));
        await new Promise((r) => setTimeout(r, 22));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

async function buildSystemPrompt(clinicId: string): Promise<string> {
  const data = await getDashboardData(clinicId);
  return [
    `You are ReviewFlow's in-app AI assistant for ${data.clinicName}, a med spa using ReviewFlow to automate patient review collection.`,
    `Today's snapshot:`,
    `- Total reviews: ${data.stats.totalReviews}`,
    `- Average rating: ${data.stats.averageRating} / 5`,
    `- Reviews this week: ${data.stats.weeklyReviewCount} (delta ${data.stats.weeklyDelta}% vs prior week)`,
    `- Sentiment score: ${data.sentimentScore} / 10`,
    `- Response rate: ${data.stats.responseRate}%`,
    `- Top services: ${data.serviceBreakdown.slice(0, 3).map((s) => `${s.service} (${s.percentage}%)`).join(', ')}`,
    `- Current streak: ${data.streakDays} day(s)`,
    ``,
    `Rules:`,
    `1. Be concise — 2 to 4 sentences max unless the user explicitly asks for more.`,
    `2. Always reference real numbers from the snapshot above when relevant.`,
    `3. Sound like a helpful colleague, not a corporate chatbot. No bullet lists unless asked.`,
    `4. If asked to draft an email or reply, keep it warm, specific, and under 80 words.`,
    `5. Never invent metrics that aren't in the snapshot. If you don't know, say so plainly.`,
  ].join('\n');
}

export async function POST(req: NextRequest) {
  let body: { suggestionId?: string; message?: string; reviewText?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Mode 1: canned suggestion
  if (body.suggestionId && CANNED_RESPONSES[body.suggestionId]) {
    return streamCannedResponse(CANNED_RESPONSES[body.suggestionId]);
  }

  // Mode 2: AI reply suggestion for a negative review
  if (body.suggestionId === 'reply-to-review' && body.reviewText) {
    return runClaudeStream({
      systemBlocks: [
        {
          type: 'text' as const,
          text: 'You are ReviewFlow\'s AI reply assistant. Draft a warm, professional reply to a negative med spa review. Acknowledge the patient\'s concern, take responsibility without being defensive, invite them to continue the conversation privately, and keep it under 70 words. No emojis.',
        },
      ],
      userMessage: `Negative review:\n"""${body.reviewText}"""\n\nDraft a reply.`,
    });
  }

  // Mode 3: free-text chat
  if (!body.message) return new Response('Missing message', { status: 400 });

  let systemPrefix: string;
  try {
    const clinicId = await getDemoClinicId();
    systemPrefix = await buildSystemPrompt(clinicId);
  } catch (err) {
    console.error('[POST /api/chat] system prompt build failed:', err);
    systemPrefix = 'You are ReviewFlow\'s in-app assistant for a med spa. Be helpful and concise.';
  }

  return runClaudeStream({
    systemBlocks: [{ type: 'text' as const, text: systemPrefix, cache_control: { type: 'ephemeral' } }],
    userMessage: body.message,
  });
}

async function runClaudeStream({
  systemBlocks,
  userMessage,
}: {
  systemBlocks: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>;
  userMessage: string;
}): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return streamCannedResponse(
      "I'm not configured with an Anthropic API key right now, so I can't answer that one live — but I can tell you the canned suggestions on the left work without an API key.",
    );
  }

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemBlocks,
          messages: [{ role: 'user', content: userMessage }],
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        console.error('[POST /api/chat] Claude stream error:', err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
