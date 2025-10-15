import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
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
