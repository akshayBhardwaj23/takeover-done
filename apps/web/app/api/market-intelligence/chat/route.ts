import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { buildChatAnswer } from '../../../../lib/market-intelligence/compute';
import type { MarketIntelligenceContext, ChatAnswer } from '../../../../lib/market-intelligence/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ChatRequest = {
  shop?: string;
  question?: string;
  scenarioId?: string;
  category?: string;
};

type ChatResponse = {
  answer: ChatAnswer;
  context: {
    shop: string;
    category: string | null;
    generatedAt: string;
  };
};

function extractText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export async function POST(req: NextRequest) {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    'unknown';
  const baseHeaders: Record<string, string> = {
    'cache-control': 'no-store, max-age=0',
    'x-zyyp-commit': commit,
    vary: 'cookie',
  };
  const json = (body: any, status = 200) =>
    NextResponse.json(body, { status, headers: baseHeaders });

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return json({ error: 'not authenticated', commit }, 401);
  }

  const body = (await req.json().catch(() => ({}))) as ChatRequest;
  const shop = extractText(body.shop);
  const question = extractText(body.question).trim();
  const scenarioId = extractText(body.scenarioId);
  const category = extractText(body.category);

  if (!question) {
    return json({ error: 'question is required', commit }, 400);
  }

  // Build context by calling the context endpoint (ensures a single source of truth).
  const baseUrl = req.nextUrl.origin;
  const ctxUrl = new URL(`${baseUrl}/api/market-intelligence/context`);
  if (shop) ctxUrl.searchParams.set('shop', shop);
  if (scenarioId) ctxUrl.searchParams.set('scenarioId', scenarioId);
  if (category) ctxUrl.searchParams.set('category', category);

  const ctxRes = await fetch(ctxUrl.toString(), {
    headers: { cookie: req.headers.get('cookie') || '' },
  });
  if (!ctxRes.ok) {
    const t = await ctxRes.text().catch(() => '');
    return json(
      { error: 'failed to build context', detail: t.slice(0, 300), commit },
      500,
    );
  }
  const ctx = (await ctxRes.json()) as MarketIntelligenceContext;

  // Phase 1: deterministic, context-only answers (no hallucinations).
  // We can later add an LLM option, but only if it returns structured JSON grounded strictly in ctx.
  const answer = buildChatAnswer({ question, ctx });

  const res: ChatResponse = {
    answer,
    context: {
      shop: ctx.shop,
      category: ctx.store.category,
      generatedAt: ctx.generatedAt,
    },
  };

  return json(res, 200);
}

