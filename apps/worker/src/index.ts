import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import { prisma } from '@ai-ecom/db';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

let inboxQueue: Queue | undefined;
let actionsQueue: Queue | undefined;

if (!redisUrl) {
  console.warn('Worker: REDIS_URL not set. Queues/workers are disabled.');
} else {
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  inboxQueue = new Queue('inbox', { connection });
  actionsQueue = new Queue('actions', { connection });

  new Worker(
    'inbox',
    async (job) => {
      console.log('Processing inbox job', job.id, job.name);
      if (job.name === 'inbound-email-process') {
        const { messageId } = job.data as any;
        if (!messageId) return;
        const msg = await prisma.message.findUnique({
          where: { id: messageId },
        });
        if (!msg) return;
        // Minimal placeholder suggestion; replace with real LLM call later
        await prisma.aISuggestion.upsert({
          where: { messageId: msg.id },
          update: {},
          create: {
            messageId: msg.id,
            reply:
              'Thanks for reaching out. We have your email and will follow up with order details shortly.',
            proposedAction: 'NONE' as any,
            orderId: msg.orderId ?? null,
            confidence: 0.4,
          },
        });
      }
    },
    { connection },
  );

  new Worker(
    'actions',
    async (job) => {
      console.log('Processing action job', job.id, job.name);
    },
    { connection },
  );

  new QueueEvents('inbox', { connection });
  new QueueEvents('actions', { connection });
}

export async function enqueueInboxJob<T>(
  name: string,
  data: T,
  opts?: JobsOptions,
) {
  if (!inboxQueue)
    return console.warn('enqueueInboxJob skipped: worker disabled');
  await inboxQueue.add(name, data, opts);
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
