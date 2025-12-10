import 'dotenv/config';
import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import { prisma } from '@ai-ecom/db';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

let inboxQueue: Queue | undefined;
let actionsQueue: Queue | undefined;

if (!redisUrl) {
  console.warn('Worker: REDIS_URL not set. Queues/workers are disabled.');
} else {
  // Ensure TLS is used for Upstash (rediss://)
  const url =
    redisUrl.startsWith('redis://') && redisUrl.includes('upstash')
      ? redisUrl.replace('redis://', 'rediss://')
      : redisUrl;

  const connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      console.log(
        `[Redis] Retrying connection in ${delay}ms (attempt ${times})`,
      );
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true; // Reconnect on readonly error
      }
      return false;
    },
    enableReadyCheck: true,
    lazyConnect: false,
  });

  // Handle connection events
  connection.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  connection.on('ready', () => {
    console.log('[Redis] Ready to accept commands');
  });

  connection.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  connection.on('close', () => {
    console.warn('[Redis] Connection closed');
  });

  connection.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  inboxQueue = new Queue('inbox', { connection });
  actionsQueue = new Queue('actions', { connection });

  new Worker(
    'inbox',
    async (job) => {
      console.log('[Worker] Processing inbox job', job.id, job.name);

      if (job.name === 'inbound-email-process') {
        const { messageId } = job.data as any;
        if (!messageId) {
          console.warn('[Worker] No messageId provided');
          return;
        }

        try {
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
            console.warn(`[Worker] Message ${messageId} not found`);
            return;
          }

          const body = msg.body || '';
          const subject = msg.thread?.subject || '';
          const customerEmail = msg.from || msg.thread?.customerEmail || '';
          const orderId = msg.orderId;
          const order = msg.order;

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
            // Get store name from connection metadata
            const connection = msg.thread?.connection;
            const metadata = (connection?.metadata as any) ?? {};
            const storeName =
              (metadata.storeName as string | undefined) ||
              connection?.shopDomain?.split('.')[0] ||
              '';
            const signatureBlock = storeName ? `${storeName} Support Team` : 'Support Team';
            reply += `Warm Regards,\n\n${signatureBlock}`;

            confidence = proposedAction === 'NONE' ? 0.4 : 0.6;
          } else {
            // Use OpenAI for AI-generated reply
            const orderContext = order
              ? `Order Details:
- Order Number: ${order.name || `#${order.shopifyId}`}
- Total Amount: $${(order.totalAmount / 100).toFixed(2)}
- Status: ${order.status}
- Customer Email: ${order.email || 'Not provided'}`
              : 'No order found - customer may need to provide order number';

            // Get store name from connection metadata for signature
            const connection = msg.thread?.connection;
            const metadata = (connection?.metadata as any) ?? {};
            const storeName =
              (metadata.storeName as string | undefined) ||
              connection?.shopDomain?.split('.')[0] ||
              'Support';
            const signatureBlock = `${storeName} Support Team`;

            const prompt = `You are a professional customer support representative for an e-commerce store. Write a personalized, empathetic, and helpful reply to the customer's email.

Guidelines:
- Be warm, professional, and empathetic
- Acknowledge their specific concern
- Use their name if available (${customerName})
- Reference their order details if available
- Provide clear next steps
- Keep it conversational but professional
- Show understanding of their situation
- Offer specific solutions based on their request
- Sign off with:
Warm Regards,

${signatureBlock}

IMPORTANT: Do NOT use placeholders like [Your Name], [Your Company], or [Your Contact Information]. Use the actual store name: ${storeName}

${orderContext}

Customer Email:
Subject: ${subject || '(no subject)'}
From: ${customerEmail}
Message: ${body}

Write a comprehensive reply that addresses their concern and provides clear next steps.`;

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
                const errorText = await resp
                  .text()
                  .catch(() => 'Unknown error');
                throw new Error(
                  `OpenAI API error: ${resp.status} - ${errorText}`,
                );
              }

              const json: any = await resp.json();
              reply =
                json.choices?.[0]?.message?.content ??
                "Thanks for reaching out. I'll follow up shortly with details.";

              // Remove any "Subject:" lines that might have been included in the reply
              reply = reply.replace(/^Subject:\s*.+$/gim, '').trim();

              // Lightweight action inference from LLM output
              const rlower = reply.toLowerCase();
              if (/refund/.test(rlower)) proposedAction = 'REFUND';
              else if (/cancel/.test(rlower)) proposedAction = 'CANCEL';
              else if (/replace/.test(rlower)) proposedAction = 'REPLACE_ITEM';
              else if (/address/.test(rlower))
                proposedAction = 'ADDRESS_CHANGE';
              else if (/(update|status|tracking)/.test(rlower))
                proposedAction = 'INFO_REQUEST';

              confidence = 0.75;
            } catch (error) {
              console.error('[Worker] OpenAI API error:', error);

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
              // Get store name from connection metadata
              const connection = msg.thread?.connection;
              const metadata = (connection?.metadata as any) ?? {};
              const storeName =
                (metadata.storeName as string | undefined) ||
                connection?.shopDomain?.split('.')[0] ||
                '';
              const signatureBlock = storeName ? `${storeName} Support Team` : 'Support Team';
              reply += `Warm Regards,\n\n${signatureBlock}`;

              confidence = 0.5;
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

          console.log(
            `[Worker] AI suggestion generated for message ${messageId}`,
          );
        } catch (error) {
          console.error(
            `[Worker] Error processing message ${messageId}:`,
            error,
          );
          throw error; // Re-throw to trigger retry
        }
      }
    },
    {
      connection,
      // Optimize Redis usage: reduce polling frequency significantly
      // 10 seconds = ~259K commands/month (allows ~240K for users within 500K limit)
      limiter: {
        max: 5, // Process max 5 jobs per interval
        duration: 10000, // 10 second interval (reduces polling from ~1s to 10s = 90% reduction)
      },
      concurrency: 2, // Process max 2 jobs concurrently (reduces overhead)
      lockDuration: 30000, // 30 seconds (default is 30000)
      stalledInterval: 30000, // Check for stalled jobs every 30s (default is 30000)
      maxStalledCount: 1, // Fail after 1 stall (default is 1)
    },
  );

  new Worker(
    'actions',
    async (job) => {
      console.log('Processing action job', job.id, job.name);
    },
    {
      connection,
      // Optimize Redis usage: reduce polling frequency
      limiter: {
        max: 10, // Process max 10 jobs per interval
        duration: 10000, // 10 second interval (reduces polling significantly)
      },
      concurrency: 2, // Process max 2 jobs concurrently
      lockDuration: 30000,
      stalledInterval: 30000,
      maxStalledCount: 1,
    },
  );

  new QueueEvents('inbox', { connection });
  new QueueEvents('actions', { connection });
}

export async function enqueueInboxJob<T>(
  name: string,
  data: T,
  opts?: JobsOptions,
) {
  if (!inboxQueue) {
    console.warn('enqueueInboxJob skipped: worker disabled');
    return;
  }

  // Default retry options with exponential backoff
  const defaultOpts: JobsOptions = {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds, then 4s, then 8s
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
    ...opts, // Allow overriding defaults
  };

  await inboxQueue.add(name, data, defaultOpts);
  console.log(`[Worker] Enqueued job: ${name}`, data);
}

export async function enqueueActionJob<T>(
  name: string,
  data: T,
  opts?: JobsOptions,
) {
  if (!actionsQueue)
    return console.warn('enqueueActionJob skipped: worker disabled');
  await actionsQueue.add(name, data, opts);
}
