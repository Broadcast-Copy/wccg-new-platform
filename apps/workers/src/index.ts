import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { runOneJob } from './agents/research-agent.js';
import { startFtpServer } from './ftp/ftp-server.js';
import { startDjDropsWatcher } from './dj-drops/dj-drops-watcher.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ─── BullMQ-backed workers (existing) ──────────────────────────────────────
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// pnpm currently has two ioredis copies installed (5.9.2 via bullmq, 5.9.3
// direct) which confuses TS's structural-equality check. Cast until the
// lockfile is de-duped. Runtime is unaffected.
type BullMQConn = ConstructorParameters<typeof Queue>[1] extends { connection: infer C } ? C : never;
const bullConn = connection as unknown as BullMQConn;

export const metadataPollQueue = new Queue('metadata-poll', { connection: bullConn });

const metadataPollWorker = new Worker(
  'metadata-poll',
  async (job) => {
    const { streamId } = job.data;
    console.log(`[metadata-poll] Polling metadata for stream ${streamId}`);
    // TODO: real metadata polling via @wccg/integrations
  },
  { connection: bullConn },
);

metadataPollWorker.on('completed', (job) => {
  console.log(`[metadata-poll] Job ${job.id} completed`);
});
metadataPollWorker.on('failed', (job, err) => {
  console.error(`[metadata-poll] Job ${job?.id} failed:`, err);
});
console.log('[workers] Metadata poll worker started');

// ─── Auto-Research Agent (Phase C3) ────────────────────────────────────────
// Polls the agent_jobs table directly (Postgres-as-queue). No Redis needed.
// Run a single in-process loop with a small concurrency for now; scale by
// running more worker instances when load demands it.
const AGENT_POLL_MS = Number(process.env.AGENT_POLL_MS ?? 15_000);

async function agentLoop() {
  while (true) {
    try {
      const ranOne = await runOneJob();
      if (!ranOne) {
        await new Promise((r) => setTimeout(r, AGENT_POLL_MS));
      }
      // If we did run a job, immediately attempt the next one (queue drain).
    } catch (err) {
      console.error('[agent] loop error:', err);
      await new Promise((r) => setTimeout(r, AGENT_POLL_MS));
    }
  }
}

if (process.env.AGENT_DISABLED !== 'true') {
  console.log('[workers] Auto-research agent loop starting');
  void agentLoop();
} else {
  console.log('[workers] Auto-research agent disabled (AGENT_DISABLED=true)');
}

// ─── DJ drop ingestion ─────────────────────────────────────────────────────
// You bring your own FTP server. This worker watches the directory tree
// at $WCCG_DROP_ROOT/incoming/<dj-slug>/, validates new audio files, writes
// dj_drops rows, and mirrors validated carts to $WCCG_DROP_ROOT/ready/ where
// Radio Spider polls. See docs/DJ-PORTAL-FTP.md for the full runbook.
startDjDropsWatcher();

// Optional embedded FTP server. Off by default — your existing FTP is the
// canonical surface. Set FTP_DISABLED=false to opt in.
if (process.env.FTP_DISABLED === 'false') {
  startFtpServer();
}
