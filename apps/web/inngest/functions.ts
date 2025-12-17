import { inngest } from './client';
import { prisma, canUseAI, incrementAISuggestion } from '@ai-ecom/db';

// Helper function to format currency for email replies
function formatOrderAmount(
  totalAmount: number,
  currency?: string | null,
): string {
  const amount = totalAmount / 100; // Convert from cents to base unit
  const curr = (currency || 'USD').toUpperCase();

  if (curr === 'INR') {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // Default to USD format for all other currencies
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to build signature block, avoiding duplication
function buildSignatureBlock(storeName: string): string {
  // If store name is generic/fallback values, just use "Support Team"
  const genericNames = ['Support', 'Your Store', 'Store', 'Shop'];
  const normalizedName = storeName.trim();

  if (genericNames.includes(normalizedName)) {
    return 'Support Team';
  }

  // If store name already contains "Support", just use the store name
  if (normalizedName.toLowerCase().includes('support')) {
    return normalizedName;
  }

  // Otherwise, use "[Store Name] Support Team"
  return `${normalizedName} Support Team`;
}

// Process inbound email and generate AI suggestion
// This replaces the BullMQ worker job
export const processInboundEmail = inngest.createFunction(
  {
    id: 'process-inbound-email',
    name: 'Process Inbound Email',
    retries: 3, // Built-in retries
  },
  { event: 'email/inbound.process' },
  async ({ event, step }) => {
    const { messageId } = event.data;

    if (!messageId) {
      console.warn('[Inngest] No messageId provided');
      return;
    }

    return await step.run('process-message', async () => {
      // Fetch message with thread and order details
      const msg = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          thread: {
            include: {
              connection: true,
            },
          },
          order: true,
        },
      });

      if (!msg) {
        console.warn(`[Inngest] Message ${messageId} not found`);
        return;
      }

      const body = msg.body || '';
      const subject = msg.thread?.subject || '';
      const customerEmail = msg.from || msg.thread?.customerEmail || '';
      const orderId = msg.orderId;
      const order = msg.order;
      const threadId = msg.threadId;

      // Conversation context (mandatory): read previous messages in this thread
      const recentThreadMessages = await prisma.message.findMany({
        where: { threadId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { body: true, direction: true, createdAt: true },
      });
      const threadMessagesChrono = [...recentThreadMessages].reverse();
      const inboundCount = threadMessagesChrono.filter(
        (m) => m.direction === 'INBOUND',
      ).length;
      const outboundCount = threadMessagesChrono.filter(
        (m) => m.direction === 'OUTBOUND',
      ).length;

      // Get store name from connection metadata
      const connection = msg.thread?.connection;
      const metadata = (connection?.metadata as any) ?? {};
      const storeName =
        (metadata.storeName as string | undefined) ||
        connection?.shopDomain ||
        'Support';
      const signatureBlock = buildSignatureBlock(storeName);

      // Check AI usage limit before generating suggestion
      const userId = connection?.userId;
      if (userId) {
        const aiUsage = await canUseAI(userId);
        if (!aiUsage.allowed) {
          console.warn(`[Inngest] AI usage limit reached for user ${userId}`);
          await prisma.aISuggestion.upsert({
            where: { messageId },
            update: {
              reply:
                'AI usage limit reached. Please upgrade your plan to continue using AI-assisted replies.',
              proposedAction: 'NONE',
              confidence: 0,
            },
            create: {
              messageId,
              reply:
                'AI usage limit reached. Please upgrade your plan to continue using AI-assisted replies.',
              proposedAction: 'NONE',
              confidence: 0,
            },
          });
          return;
        }
      }

      // Extract customer name from email
      const customerName = customerEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      // Detect action from keywords (fallback if OpenAI fails)
      const lower = `${subject} ${body}`.toLowerCase();
      const keywordToAction: Array<{ re: RegExp; action: any }> = [
        { re: /(refund|money\s*back|chargeback)/, action: 'REFUND' },
        { re: /(cancel|cancellation)/, action: 'CANCEL' },
        { re: /(replace|replacement|damaged)/, action: 'REPLACE_ITEM' },
        {
          re: /(address|ship\s*to|wrong\s*address|change\s*address)/,
          action: 'ADDRESS_CHANGE',
        },
        { re: /(where is|status|update|tracking)/, action: 'INFO_REQUEST' },
      ];
      let detectedAction: any = 'NONE';
      for (const k of keywordToAction) {
        if (k.re.test(lower)) {
          detectedAction = k.action;
          break;
        }
      }

      const apiKey = process.env.OPENAI_API_KEY;

      let reply: string;
      let proposedAction: string = detectedAction;
      let confidence: number = 0.6;
      let followUpRequired = false;
      let followUpHours: number | null = null;

      const ensureSignature = (text: string) => {
        const trimmed = (text || '').trim();
        if (!trimmed) return trimmed;
        if (/Warm Regards,/i.test(trimmed)) return trimmed;
        return `${trimmed}\n\nWarm Regards,\n\n${signatureBlock}`.trim();
      };

      const safeExtractJson = (text: string) => {
        const raw = String(text || '').trim();
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) return raw.slice(start, end + 1);
        return raw;
      };

      if (!apiKey) {
        // Enhanced fallback without OpenAI
        reply = `Hi ${customerName},\n\n`;
        reply += `Thank you for reaching out to us! `;

        if (order) {
          reply += `I can see your order ${order.name || `#${order.shopifyId}`} in our system and I'm here to help you with any questions or concerns you may have.\n\n`;
        } else {
          reply += `I'd be happy to assist you with your inquiry. `;
          reply += `If you have an order number, please share it so I can look up your specific order details.\n\n`;
        }

        // Action-specific responses
        if (proposedAction === 'REFUND') {
          reply += `I understand you're interested in a refund. I can definitely help you with that process. `;
          reply += `Let me review your order details and get back to you with the next steps within the next few hours.\n\n`;
        } else if (proposedAction === 'CANCEL') {
          reply += `I see you'd like to cancel your order. `;
          reply += `Let me check if your order is still eligible for cancellation and I'll get back to you with the details.\n\n`;
        } else if (proposedAction === 'REPLACE_ITEM') {
          reply += `I understand you need a replacement for an item. `;
          reply += `I'll review your order and arrange for a replacement to be sent out to you.\n\n`;
        } else if (proposedAction === 'ADDRESS_CHANGE') {
          reply += `I can help you update your shipping address. `;
          reply += `Let me check your order status and make the necessary changes for you.\n\n`;
        } else if (proposedAction === 'INFO_REQUEST') {
          reply += `I'll look into your order status and provide you with a detailed update. `;
          reply += `You can expect to hear from me with tracking information and next steps.\n\n`;
        } else {
          reply += `I'm reviewing your message and will provide you with a detailed response shortly. `;
          reply += `I want to make sure I address all your concerns properly.\n\n`;
        }

        reply += `If you have any other questions in the meantime, please don't hesitate to reach out.\n\n`;
        reply += `Warm Regards,\n\n`;
        reply += signatureBlock;

        confidence = proposedAction === 'NONE' ? 0.4 : 0.6;
      } else {
        // Use OpenAI for AI-generated reply
        const orderContext = order
          ? `Order Details:
- Order Number: ${order.name || `#${order.shopifyId}`}
- Total Amount: ${formatOrderAmount(order.totalAmount, order.currency)}
- Status: ${order.status}
- Customer Email: ${order.email || 'Not provided'}`
          : 'No order found - customer may need to provide order number';

        const recentMessages = threadMessagesChrono
          .slice(-6)
          .map((m) => {
            const role = m.direction === 'INBOUND' ? 'Customer' : 'Support';
            const date = new Date(m.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            return `${role} (${date}): ${String(m.body || '').slice(0, 250)}`;
          })
          .join('\n\n');

        const fullConversationText = [
          subject,
          body,
          ...threadMessagesChrono.map((m) => String(m.body || '')),
        ]
          .filter(Boolean)
          .join('\n')
          .toLowerCase();

        const explicitRefundRequest =
          /(refund my money|cancel and refund|refund my order|i want a refund|i don't want (the|this) (product|order) anymore|don'?t want it anymore|money back)/i.test(
            fullConversationText,
          );
        const conditionalRefundRequest =
          /(refund if|only if you can deliver|proceed only if|if it can'?t be delivered|deliver(ed)? by )/i.test(
            fullConversationText,
          );
        const delayOrNoProgressSignal =
          /(where is my order|not received|still not received|delayed|late|no update|no progress|stuck|unfulfilled)/i.test(
            fullConversationText,
          ) ||
          /\b(it'?s been|been)\s+\d+\s+(day|days|week|weeks)\b/i.test(
            fullConversationText,
          );

        const fulfillment = String(order?.fulfillmentStatus || '').toLowerCase();
        const isUnfulfilled =
          fulfillment === 'unfulfilled' ||
          fulfillment === 'unshipped' ||
          fulfillment === 'pending' ||
          fulfillment === '';

        const orderAgeDays =
          order?.createdAt instanceof Date
            ? (Date.now() - order.createdAt.getTime()) / 86400000
            : null;

        const deliveryPromiseLikelyBreached =
          delayOrNoProgressSignal &&
          (inboundCount >= 2 ||
            (orderAgeDays != null && orderAgeDays >= 7 && isUnfulfilled));

        const refundShouldBeImmediate =
          explicitRefundRequest ||
          (deliveryPromiseLikelyBreached && isUnfulfilled) ||
          (/(fraud|scam|stolen|lost|damaged)/i.test(fullConversationText) &&
            (explicitRefundRequest || inboundCount >= 2));

        const feasibilityCheckIsMeaningful =
          !refundShouldBeImmediate &&
          conditionalRefundRequest &&
          isUnfulfilled &&
          inboundCount <= 2;

        const prompt = `You are a customer support agent for an e-commerce store.

MANDATORY: This is an ongoing conversation thread. Read all previous messages below before replying. Never treat the latest email as a fresh request.

Context:
- Store: ${storeName}
- Customer: ${customerName} (${customerEmail || 'unknown'})
- Inbound messages: ${inboundCount}
- Outbound messages: ${outboundCount}
- Signals:
  - Explicit refund request: ${explicitRefundRequest ? 'YES' : 'NO'}
  - Conditional refund request: ${conditionalRefundRequest ? 'YES' : 'NO'}
  - Delay/no-progress signal: ${delayOrNoProgressSignal ? 'YES' : 'NO'}
  - Fulfillment appears UNFULFILLED: ${isUnfulfilled ? 'YES' : 'NO'}
  - Delivery promise likely breached: ${deliveryPromiseLikelyBreached ? 'YES' : 'NO'}
  - Refund should be immediate: ${refundShouldBeImmediate ? 'YES' : 'NO'}
  - Feasibility check meaningful: ${feasibilityCheckIsMeaningful ? 'YES' : 'NO'}

Previous conversation (oldest → newest):
${recentMessages || '(no previous messages)'}

${orderContext}

Core rules (follow strictly):
1) Conversation awareness:
   - If customer has emailed more than once, acknowledge prior messages.
   - When applicable, use this pattern: "Earlier you mentioned X, and I now see that you’re asking Y."
2) Refund decision logic:
   - If customer explicitly asks for a refund/cancel+refund OR delivery promise is breached and the order is still unfulfilled OR nothing actionable remains → be decisive: say the refund is being processed, explain why, and close confidently. Do NOT promise follow-ups.
   - If customer asked for a conditional refund ("refund if it can’t be delivered in X days") AND the order is not shipped and a realistic ETA can be checked → take ownership, commit to a time-bound check (e.g., 24 hours), and refund only if the condition can’t be met.
3) Follow-up commitments (critical):
   - If you say "I'll check / I'll update / I'm escalating / I'll verify" you MUST include a specific time commitment and ownership.
   - End with: "I’ll get back to you by [day/time] with an update."
4) No open-ended closings:
   - Do not end with "Please let me know" / "Looking forward to your response".
5) Avoid repeating questions:
   - Do not ask for information already present in the conversation (order number/email/etc).
6) Tone:
   - Calm, confident, solution-oriented. Avoid over-apologizing. No placeholders.

Output format (STRICT JSON only; no extra text):
{
  "reply": string,
  "proposed_action": "REFUND" | "CANCEL" | "INFO_REQUEST" | "NONE",
  "follow_up_required": boolean,
  "follow_up_hours": number | null
}

Latest customer email:
Subject: ${subject || '(no subject)'}
Message: ${body}`;

        try {
          const resp = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
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
                    content: `You are a professional customer support representative with excellent communication skills. You write personalized, empathetic, and helpful responses that make customers feel valued and understood. You always:

1. Acknowledge the customer's specific concern
2. Use a warm, professional tone
3. Reference their order details when available
4. Provide clear, actionable next steps
5. Show genuine care for their experience
6. Keep responses comprehensive but not overwhelming
7. Use the customer's name when appropriate
8. Address their specific request directly

Write responses that sound like they come from a real human support agent who genuinely cares about helping the customer.

IMPORTANT: Do NOT include the email subject line in your reply. Only write the email body content. The subject will be set separately.

Always end your response with:
Warm Regards,

${signatureBlock}

Do NOT use placeholders like [Your Name], [Your Company], or [Your Contact Information]. Use the actual store name: ${storeName}`,
                  },
                  { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 400,
              }),
            },
          );

          if (!resp.ok) {
            const errorText = await resp.text().catch(() => 'Unknown error');
            throw new Error(`OpenAI API error: ${resp.status} - ${errorText}`);
          }

          const json: any = await resp.json();
          const content =
            json.choices?.[0]?.message?.content ??
            `{"reply":"Thanks for reaching out. I’ll check this and update you within 24 hours.\\n\\nI’ll get back to you by tomorrow with an update.\\n\\nWarm Regards,\\n\\n${signatureBlock.replace(
              /"/g,
              '\\"',
            )}","proposed_action":"INFO_REQUEST","follow_up_required":true,"follow_up_hours":24}`;

          let parsed: any = null;
          try {
            parsed = JSON.parse(safeExtractJson(String(content)));
          } catch {
            parsed = null;
          }

          const parsedReply =
            parsed && typeof parsed.reply === 'string' ? parsed.reply : '';
          reply = ensureSignature(
            parsedReply ||
              "Thanks for reaching out. I’ll check this and update you within 24 hours.\n\nI’ll get back to you by tomorrow with an update.",
          );

          const pa = parsed?.proposed_action;
          proposedAction =
            pa === 'REFUND' || pa === 'CANCEL' || pa === 'INFO_REQUEST' || pa === 'NONE'
              ? pa
              : detectedAction;

          followUpRequired = Boolean(parsed?.follow_up_required);
          followUpHours =
            typeof parsed?.follow_up_hours === 'number' && parsed.follow_up_hours > 0
              ? parsed.follow_up_hours
              : null;

          // Confidence: keep lightweight and fast
          confidence = 0.75;
        } catch (error) {
          console.error('[Inngest] OpenAI API error:', error);

          // Fallback response on OpenAI error
          reply = `Hi ${customerName},\n\n`;
          reply += `Thank you for contacting us! `;

          if (order) {
            reply += `I can see your order ${order.name || `#${order.shopifyId}`} and I'm here to help.\n\n`;
          } else {
            reply += `I'd be happy to assist you with your inquiry.\n\n`;
          }

          reply += `I'm currently reviewing your message and will provide you with a detailed response shortly. `;
          reply += `I want to make sure I address all your concerns properly.\n\n`;
          reply += `If you have any urgent questions, please don't hesitate to reach out.\n\n`;
          reply += `Warm Regards,\n\n`;
          reply += signatureBlock;

          confidence = 0.5;
        }
      }

      // Internal follow-up tracking (no DB migration): write an Event when follow-up is promised
      if (followUpRequired && followUpHours) {
        const dueAt = new Date(Date.now() + followUpHours * 60 * 60 * 1000);
        try {
          await prisma.event.create({
            data: {
              type: 'thread.follow_up_required',
              entity: 'thread',
              entityId: threadId,
              payload: { messageId, followUpHours, followUpDueAt: dueAt.toISOString() } as any,
            },
          });
        } catch (e) {
          console.error('[Inngest] Failed to record follow-up event:', e);
        }
      }

      // Save AI suggestion
      await prisma.aISuggestion.upsert({
        where: { messageId: msg.id },
        update: {
          reply,
          proposedAction: proposedAction as any,
          confidence,
        },
        create: {
          messageId: msg.id,
          reply,
          proposedAction: proposedAction as any,
          orderId: orderId ?? null,
          confidence,
        },
      });

      // Increment AI suggestion count after successfully generating
      if (userId) {
        try {
          await incrementAISuggestion(userId);
        } catch (error) {
          console.error(
            '[Inngest] Failed to increment AI suggestion count:',
            error,
          );
        }
      }

      console.log(`[Inngest] AI suggestion generated for message ${messageId}`);

      return { success: true, messageId };
    });
  },
);
