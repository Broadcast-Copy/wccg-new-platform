import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// Metadata polling queue — polls Centova/Icecast for current track info
export const metadataPollQueue = new Queue('metadata-poll', { connection });

const metadataPollWorker = new Worker(
  'metadata-poll',
  async (job) => {
    const { streamId } = job.data;
    console.log(`[metadata-poll] Polling metadata for stream ${streamId}`);
    // TODO: Implement real metadata polling via @wccg/integrations
    // 1. Fetch current track from Centova/Icecast
    // 2. Update StreamMetadata in database
    // 3. Push update to SSE clients via Redis pub/sub
  },
  { connection },
);

metadataPollWorker.on('completed', (job) => {
  console.log(`[metadata-poll] Job ${job.id} completed`);
});

metadataPollWorker.on('failed', (job, err) => {
  console.error(`[metadata-poll] Job ${job?.id} failed:`, err);
});

console.log('[workers] Metadata poll worker started');
