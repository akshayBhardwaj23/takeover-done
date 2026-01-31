'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '../../../components/ui/badge';

type ChatMessage =
  | { role: 'user'; text: string }
  | {
      role: 'assistant';
      directAnswer: string;
      marketEvidence: string[];
      storeImpact: string[];
      confidence: 'High' | 'Medium' | 'Low';
      ctas: Array<{ label: string; href: string }>;
    };

export function MarketCopilotChat(props: {
  shop: string;
  scenarioId?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      directAnswer:
        'Ask me a decision question like “Why are my sales down this week?” or “Is this a good time to increase Meta ad spend?”',
      marketEvidence: [],
      storeImpact: [],
      confidence: 'Low',
      ctas: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const canSend = props.shop && input.trim().length > 0 && !loading;

  const suggestions = useMemo(
    () => [
      'Why are my sales down this week?',
      'Is the market slow right now or is it just my store?',
      'Is this a good time to increase Meta ad spend?',
      'Are customers price-sensitive right now?',
    ],
    [],
  );

  async function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setInput('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    try {
      const res = await fetch('/api/market-intelligence/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: props.shop,
          scenarioId: props.scenarioId,
          question: q,
        }),
      });
      const commit = res.headers.get('x-zyyp-commit');
      const raw = await res.text();
      let json: any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }
      if (!res.ok) {
        const baseMsg =
          (json && (json.error || json.message)) ||
          (raw ? raw.slice(0, 200) : '') ||
          'Chat failed';
        const stage = json?.stage ? ` (stage: ${String(json.stage)})` : '';
        const detail = json?.detail ? ` — ${String(json.detail).slice(0, 200)}` : '';
        const ver = commit ? ` (commit: ${commit.slice(0, 7)})` : '';
        throw new Error(String(baseMsg) + stage + ver + detail);
      }
      if (!json) throw new Error('Empty response from chat API');
      const a = json?.answer;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          directAnswer: String(a?.directAnswer || ''),
          marketEvidence: Array.isArray(a?.marketEvidence) ? a.marketEvidence.map(String) : [],
          storeImpact: Array.isArray(a?.storeImpact) ? a.storeImpact.map(String) : [],
          confidence: (a?.confidence as any) || 'Low',
          ctas: Array.isArray(a?.ctas) ? a.ctas : [],
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          directAnswer: `I couldn’t answer that right now: ${String(e?.message || e)}`,
          marketEvidence: [],
          storeImpact: ['Try again, or open Predictive Insights to validate the underlying forecast inputs.'],
          confidence: 'Low',
          ctas: [{ label: 'Open Predictive Insights', href: `/predictive-insights?shop=${encodeURIComponent(props.shop)}` }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:bg-white"
            onClick={() => send(s)}
            disabled={!props.shop || loading}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto rounded-2xl bg-white/50 p-3 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 backdrop-blur">
        <div className="space-y-3">
          {messages.map((m, idx) =>
            m.role === 'user' ? (
              <div key={idx} className="flex justify-end">
                <div className="max-w-[92%] rounded-2xl bg-slate-900/5 px-3 py-2 text-xs font-medium text-slate-800 ring-1 ring-slate-900/5">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={idx} className="flex justify-start">
                <div className="w-full max-w-[96%] rounded-2xl bg-white/70 p-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-900">Answer</div>
                    <Badge variant="secondary">{m.confidence}</Badge>
                  </div>

                  <div className="mt-2 text-sm text-slate-800">{m.directAnswer}</div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Market context
                      </div>
                      {m.marketEvidence.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                          {m.marketEvidence.slice(0, 3).map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-xs text-slate-500">
                          No additional market context available for this question.
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Store-specific impact
                      </div>
                      {m.storeImpact.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                          {m.storeImpact.slice(0, 3).map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-xs text-slate-500">
                          No store-specific impact available for this question.
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Recommended action
                      </div>
                      {m.ctas.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.ctas.slice(0, 3).map((c, i) => (
                            <Link
                              key={i}
                              href={(c.href as any)}
                              className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:bg-white"
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-500">
                          No direct action suggested — ask “what should I do next?” for a clearer recommendation.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={props.shop ? 'Ask “why”, “should I”, or “what happens if…”' : 'Select a shop first'}
          className="h-11 w-full rounded-2xl bg-white/80 px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/10 transition focus:outline-none focus:ring-2 focus:ring-slate-900/15"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSend) send(input);
          }}
          disabled={!props.shop || loading}
        />
        <button
          type="button"
          className="h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:opacity-50"
          onClick={() => send(input)}
          disabled={!canSend}
        >
          {loading ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

