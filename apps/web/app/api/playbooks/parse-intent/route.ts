import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface ParsedPlaybook {
  name: string;
  description?: string;
  category?: string;
  structure: {
    trigger: {
      type: 'shopify_event' | 'email_intent' | 'scheduled';
      config: Record<string, any>;
    };
    conditions: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
    actions: Array<{
      type: string;
      config: Record<string, any>;
    }>;
  };
}

const FALLBACK_RESPONSE: ParsedPlaybook = {
  name: 'Custom Automation',
  description: 'Automation generated from natural language input.',
  category: 'CUSTOM',
  structure: {
    trigger: {
      type: 'shopify_event',
      config: { event: 'order_created', time: '09:00' },
    },
    conditions: [
      { field: 'order_total', operator: '>', value: '50' },
    ],
    actions: [
      {
        type: 'send_email',
        config: {
          email_subject: 'We are taking care of your order',
          email_body:
            'Hi {{customer_name}}, thanks for shopping with us! We will keep you posted about your order {{order_id}}.',
          discount_code: '',
          send_delay: 'immediate',
        },
      },
    ],
  },
};

function simpleHeuristicParse(prompt: string): ParsedPlaybook {
  const lower = prompt.toLowerCase();
  const isRefund = lower.includes('refund') || lower.includes('return');
  const isDelay = lower.includes('delay') || lower.includes('late');
  const wantsEmail = lower.includes('email') || lower.includes('notify');
  const discountMatch = lower.match(/(\d+)%/);
  const discount = discountMatch ? `${discountMatch[1]}%` : '';

  const category = isRefund
    ? 'REFUND_RETURN'
    : isDelay
    ? 'FULFILLMENT'
    : 'CUSTOM';

  const trigger =
    isDelay
      ? { type: 'shopify_event', config: { event: 'order_delayed' } }
      : { type: 'shopify_event', config: { event: 'order_created' } };

  const conditions = isDelay
    ? [{ field: 'days_delayed', operator: '>', value: '5' }]
    : [];

  const actions = wantsEmail
    ? [
        {
          type: 'send_email',
          config: {
            email_subject:
              discount !== ''
                ? `We're sorry for the delay – enjoy ${discount} off`
                : "We're on it!",
            email_body: discount
              ? `Hi {{customer_name}}, your order {{order_id}} is taking longer than expected. Here's a ${discount} discount code to use on your next purchase.`
              : `Hi {{customer_name}}, thanks for reaching out. We are handling your request for order {{order_id}}.`,
            discount_code: discount ? `THANKYOU${discount.replace('%', '')}` : '',
            send_delay: 'immediate',
          },
        },
      ]
    : [];

  return {
    name: 'Generated Automation',
    description: prompt,
    category,
    structure: {
      trigger,
      conditions,
      actions,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(simpleHeuristicParse(prompt));
    }

    const systemPrompt = `
You are Playbook Architect, an AI assistant that converts ecommerce automation ideas into structured JSON.
The JSON MUST be valid and follow this schema:
{
  "name": string,
  "description": string,
  "category": "REFUND_RETURN" | "MARKETING" | "FULFILLMENT" | "SUPPORT" | "INVENTORY" | "CUSTOM",
  "structure": {
    "trigger": {
      "type": "shopify_event" | "email_intent" | "scheduled",
      "config": object
    },
    "conditions": [
      {
        "field": string,
        "operator": ">" | "<" | "==" | "!=" | "contains",
        "value": string
      }
    ],
    "actions": [
      {
        "type": string,
        "config": object
      }
    ]
  }
}

Rules:
- Always include at least one action.
- If the automation includes messaging, add a "send_email" action with "email_subject", "email_body", "discount_code" (optional), and "send_delay".
- Use Shopify merge tags like {{customer_name}}, {{order_id}}, {{product_name}} in the email body where helpful.
- For triggers, use Shopify events such as "order_created", "order_delayed", "order_refunded", or intents like "refund_request".
- Conditions should reference clear fields e.g., "days_delayed", "refund_amount".
- Set category based on the intent: refunds, marketing, fulfillment, support, inventory, or custom.
- Return only the JSON with no additional text.
    `.trim();

    const userPrompt = `
User request:
${prompt}

Context (optional):
${context ?? 'n/a'}
    `.trim();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('OpenAI parse-intent error:', response.status, body);
      return NextResponse.json(simpleHeuristicParse(prompt));
    }

    const data = await response.json();
    const parsed: ParsedPlaybook = JSON.parse(data.choices[0].message.content);

    if (!parsed?.structure?.trigger || !Array.isArray(parsed.structure.actions)) {
      return NextResponse.json(simpleHeuristicParse(prompt));
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error parsing playbook intent:', error);
    return NextResponse.json(FALLBACK_RESPONSE, { status: 200 });
  }
}

