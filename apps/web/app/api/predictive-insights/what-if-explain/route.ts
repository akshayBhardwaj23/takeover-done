import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

export const runtime = 'nodejs';

type ExplainRequest = {
  shop: string;
  currency: string;
  config: Record<string, unknown>;
  totals: {
    horizonDays: 7 | 30 | 90;
    base: { revenue: number; orders: number; sessions: number; aovAvg: number; cvrAvg: number | null };
    scenario: { revenue: number; orders: number; sessions: number; aovAvg: number; cvrAvg: number | null };
    uplift: { revenuePct: number | null; ordersPct: number | null; sessionsPct: number | null; aovPct: number | null; cvrPct: number | null };
  }[];
  risk: { label: 'Low' | 'Medium' | 'High'; reasons: string[] };
};

function fallbackExplain(body: ExplainRequest) {
  const t30 = body.totals.find((t) => t.horizonDays === 30) ?? body.totals[0];
  const revUplift = t30?.uplift.revenuePct;
  const ordersUplift = t30?.uplift.ordersPct;
  const aovUplift = t30?.uplift.aovPct;
  const sessionsUplift = t30?.uplift.sessionsPct;

  const drivers: string[] = [];
  if (sessionsUplift != null) drivers.push(`Sessions: ${sessionsUplift >= 0 ? '+' : ''}${sessionsUplift.toFixed(1)}%`);
  if (ordersUplift != null) drivers.push(`Orders: ${ordersUplift >= 0 ? '+' : ''}${ordersUplift.toFixed(1)}%`);
  if (aovUplift != null) drivers.push(`AOV: ${aovUplift >= 0 ? '+' : ''}${aovUplift.toFixed(1)}%`);

  return {
    summary:
      revUplift == null
        ? 'Scenario computed. Add assumptions to see projected uplift.'
        : `Projected 30-day revenue change: ${revUplift >= 0 ? '+' : ''}${revUplift.toFixed(1)}%.`,
    drivers,
    risks: body.risk.reasons,
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }

  const body = (await req.json()) as ExplainRequest;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, explanation: fallbackExplain(body), mode: 'fallback' });
  }

  const prompt = {
    instruction:
      'Write a concise explanation grounded ONLY in the provided computed numbers. Do not invent causes, channels, or external events.',
    shop: body.shop,
    scenarioInputs: body.config,
    totals: body.totals,
    risk: body.risk,
    required:
      'Explain: (1) what changed in inputs, (2) what drives revenue change: sessions vs orders(CVR) vs AOV, (3) what could break: use provided risk reasons. Keep it short.',
  };

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an analytics assistant. You must only explain provided computed data. Never speculate.',
          },
          { role: 'user', content: JSON.stringify(prompt) },
        ],
        temperature: 0.2,
        max_tokens: 450,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return NextResponse.json({ ok: true, explanation: fallbackExplain(body), mode: 'fallback', error: text });
    }

    const json: any = await resp.json();
    const content = json.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      ok: true,
      mode: 'llm',
      explanation: { text: content },
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: true,
      mode: 'fallback',
      explanation: fallbackExplain(body),
      error: e?.message || 'unknown_error',
    });
  }
}

