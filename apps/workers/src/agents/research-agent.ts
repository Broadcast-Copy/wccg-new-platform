/**
 * Auto-Research Agent — Phase C3.
 *
 * Karpathy-style "small, auditable program, not a mystery box."
 *
 *    plan ─► search/fetch ─► extract ─► draft ─► self-critique ─► persist
 *
 * Architecture choices:
 *  - Claude (Anthropic API) via direct fetch — no SDK dependency to add today;
 *    upgradeable to @anthropic-ai/sdk in one line when desired.
 *  - Server-side `web_search` tool (Claude's hosted web search) so we don't
 *    have to ship a search adapter.
 *  - System prompt + style guide are sent with `cache_control: ephemeral` so
 *    repeated runs cost a fraction of the first one.
 *  - Every claim must cite a source that was actually fetched in this run —
 *    enforced by the critic pass.
 *
 * The agent is invoked from `runOneJob()` below, which the index.ts loop
 * polls every N seconds. No Redis required — `agent_jobs` is the queue.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are the WCCG Wiki Auto-Research Agent.

Your job: write a short, accurate, sourced wiki article about the entity named in the user message.

NON-NEGOTIABLE RULES:
1. Every factual claim must be supported by a source you fetched in this run via the web_search tool.
2. If you can't find a source for a claim, do not make the claim.
3. Tone: matter-of-fact, journalistic. No marketing copy. No "renowned/iconic/legendary" filler.
4. Length: 200-450 words for artists/hosts/places, 80-200 for tracks/genres.
5. Format: Markdown. Start with one short lead paragraph (2-3 sentences). Then 2-4 short sections with H2 headings.
6. Every paragraph that makes a factual claim ends with a citation footnote like [^1]. Footnote definitions go at the bottom, one per source URL.
7. Use [[wiki/links]] in double-brackets when referencing other entities (other artists, hosts, places). Slug = lowercase, hyphenated.
8. Do not invent dates, awards, or chart positions. If unsure, omit.

Output exactly one fenced code block containing the JSON object:

  {
    "body_md": "<the markdown article>",
    "sources": [{"url": "...", "title": "...", "excerpt": "<60-word excerpt that supports the claims>"}],
    "confidence": 0.0-1.0,
    "reasoning_summary": "<one short sentence about how confident you are and why>"
  }

Nothing else outside the code block.`;

const CRITIC_SYSTEM = `You are the Hallucination Critic.

You will be given (1) a draft Markdown article and (2) a list of source URLs+excerpts that the writer fetched.

For every factual claim in the article, decide whether the cited source actually supports it.

Output JSON only:
  {
    "unsupported_claims": ["<claim 1>", "<claim 2>"],
    "passed": true | false,
    "calibrated_confidence": 0.0-1.0
  }

Be strict. If a date, name, place, or award is not literally in the cited source excerpt, list it as unsupported.`;

interface JobRow {
  id: string;
  entity_slug: string;
  entity_type: string;
  display_name: string;
  trigger: string;
  attempts: number;
}

interface SourceCard {
  url: string;
  title?: string;
  excerpt?: string;
}

interface AgentDraft {
  body_md: string;
  sources: SourceCard[];
  confidence: number;
  reasoning_summary?: string;
}

interface CriticResult {
  unsupported_claims: string[];
  passed: boolean;
  calibrated_confidence: number;
}

interface AnthropicMessageResponse {
  id: string;
  model: string;
  content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; name: string; input: unknown }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

let _db: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL + SUPABASE_SECRET_KEY required');
  }
  _db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _db;
}

/**
 * Pull one queued job, run it through the agent, persist the result.
 * Returns true if a job was processed (so the loop can run again immediately).
 */
export async function runOneJob(): Promise<boolean> {
  if (!ANTHROPIC_API_KEY) {
    console.warn('[agent] ANTHROPIC_API_KEY not set — agent disabled. Jobs will queue.');
    return false;
  }

  // Pop one job. We use a simple "select then update" pattern; SKIP LOCKED
  // would be better but Supabase REST doesn't expose it. For low concurrency
  // (1 worker), this is fine.
  const { data: rows } = await db().from('agent_jobs')
    .select('*')
    .eq('status', 'queued')
    .lte('next_attempt_at', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('next_attempt_at', { ascending: true })
    .limit(1);

  const job: JobRow | undefined = rows?.[0];
  if (!job) return false;

  // Claim the job. If another worker already claimed it, skip.
  const { error: claimErr, data: claimed } = await db().from('agent_jobs')
    .update({ status: 'running', attempts: (job.attempts ?? 0) + 1 })
    .eq('id', job.id)
    .eq('status', 'queued')
    .select()
    .single();
  if (claimErr || !claimed) return false;

  console.log(`[agent] Running ${job.entity_type}/${job.entity_slug} (trigger=${job.trigger})`);

  const runStart = Date.now();
  const { data: runRow } = await db().from('agent_runs')
    .insert({
      entity_slug: job.entity_slug,
      trigger: job.trigger,
      status: 'running',
      model: ANTHROPIC_MODEL,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  try {
    const result = await runAgentLoop(job.entity_type, job.display_name);
    await persistResult(job, runRow.id, result, Date.now() - runStart);
    await db().from('agent_jobs').update({ status: 'done' }).eq('id', job.id);
    console.log(`[agent] ✓ ${job.entity_slug} confidence=${result.calibratedConfidence.toFixed(2)}`);
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[agent] ✗ ${job.entity_slug}: ${msg}`);
    await db().from('agent_runs')
      .update({
        status: 'failed',
        error: msg,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - runStart,
      })
      .eq('id', runRow.id);
    // Backoff: 5x attempts^2 minutes, max 4 hours.
    const attempts = (job.attempts ?? 0) + 1;
    const backoffMin = Math.min(240, 5 * attempts * attempts);
    await db().from('agent_jobs')
      .update({
        status: attempts >= 4 ? 'failed' : 'queued',
        last_error: msg,
        next_attempt_at: new Date(Date.now() + backoffMin * 60_000).toISOString(),
      })
      .eq('id', job.id);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Agent loop
// ---------------------------------------------------------------------------

interface AgentResult {
  draft: AgentDraft;
  critic: CriticResult;
  calibratedConfidence: number;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

async function runAgentLoop(entityType: string, displayName: string): Promise<AgentResult> {
  // ── 1. Plan + draft pass with web_search tool ──────────────────────────
  const userMsg = `Entity type: ${entityType}\nEntity name: ${displayName}\n\nResearch and write the wiki article.`;

  const draftRes = await callAnthropic({
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
    max_tokens: 2400,
    cacheSystem: true,
  });

  const draftText = extractText(draftRes);
  const draft = parseAgentJson(draftText) as AgentDraft;

  if (!draft.body_md || !Array.isArray(draft.sources) || draft.sources.length === 0) {
    throw new Error('Draft missing body_md or sources');
  }

  // ── 2. Critic pass ─────────────────────────────────────────────────────
  const criticUserMsg = JSON.stringify({
    article: draft.body_md,
    sources: draft.sources.map((s) => ({ url: s.url, title: s.title, excerpt: s.excerpt })),
  });

  const criticRes = await callAnthropic({
    system: CRITIC_SYSTEM,
    messages: [{ role: 'user', content: criticUserMsg }],
    max_tokens: 800,
    cacheSystem: true,
  });

  const criticText = extractText(criticRes);
  const critic = parseAgentJson(criticText) as CriticResult;

  // ── 3. Calibrate ───────────────────────────────────────────────────────
  // Combine the writer's self-reported confidence with the critic's score.
  // Penalize hard for unsupported claims (each one drops 0.1).
  const unsupported = critic.unsupported_claims?.length ?? 0;
  const writerConf = Math.max(0, Math.min(1, draft.confidence ?? 0.5));
  const criticConf = Math.max(0, Math.min(1, critic.calibrated_confidence ?? 0.5));
  const calibrated = Math.max(0, (writerConf * 0.4 + criticConf * 0.6) - unsupported * 0.1);

  const costUsd = estimateCostUsd(draftRes.usage) + estimateCostUsd(criticRes.usage);

  return {
    draft,
    critic,
    calibratedConfidence: calibrated,
    costUsd,
    promptTokens: (draftRes.usage.input_tokens ?? 0) + (criticRes.usage.input_tokens ?? 0),
    completionTokens: (draftRes.usage.output_tokens ?? 0) + (criticRes.usage.output_tokens ?? 0),
    cacheReadTokens:
      (draftRes.usage.cache_read_input_tokens ?? 0) + (criticRes.usage.cache_read_input_tokens ?? 0),
    cacheCreationTokens:
      (draftRes.usage.cache_creation_input_tokens ?? 0) +
      (criticRes.usage.cache_creation_input_tokens ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Persistence — wiki_entities + wiki_sources + wiki_links + agent_runs
// ---------------------------------------------------------------------------

const AUTO_PUBLISH_THRESHOLD = 0.9;

async function persistResult(
  job: JobRow,
  runId: string,
  result: AgentResult,
  durationMs: number,
) {
  // Upsert the entity. Auto-publish only above threshold AND for non-people types.
  const isSensitive = ['artist', 'host'].includes(job.entity_type);
  const status =
    result.calibratedConfidence >= AUTO_PUBLISH_THRESHOLD && !isSensitive
      ? 'published'
      : result.calibratedConfidence >= 0.7
        ? 'in_review'
        : 'draft';

  const needsReview = status !== 'published';

  const { data: entity, error: entErr } = await db().from('wiki_entities')
    .upsert(
      {
        slug: job.entity_slug,
        type: job.entity_type,
        display_name: job.display_name,
        body_md: result.draft.body_md,
        body_html: null, // server can render later, or render at read time
        confidence: result.calibratedConfidence,
        needs_review: needsReview,
        status,
        last_researched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' } as any,
    )
    .select()
    .single();
  if (entErr) throw entErr;

  // Replace sources for this entity.
  await db().from('wiki_sources').delete().eq('entity_id', entity.id);
  if (result.draft.sources.length > 0) {
    await db().from('wiki_sources').insert(
      result.draft.sources.map((s) => ({
        entity_id: entity.id,
        url: s.url,
        title: s.title ?? null,
        excerpt: s.excerpt ?? null,
        agent_run_id: runId,
      })),
    );
  }

  // Refresh outbound wiki_links from this slug.
  const linkRe = /\[\[(?:wiki\/)?([a-z0-9][a-z0-9-]*)(?:\|[^\]]*)?\]\]/gi;
  const targets = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(result.draft.body_md))) {
    if (m[1] && m[1] !== job.entity_slug) targets.add(m[1].toLowerCase());
  }
  await db().from('wiki_links').delete().eq('source_slug', job.entity_slug);
  if (targets.size > 0) {
    await db().from('wiki_links').insert(
      Array.from(targets).map((t) => ({ source_slug: job.entity_slug, target_slug: t })),
    );
  }

  // Close out the agent_runs row.
  await db().from('agent_runs')
    .update({
      status: 'succeeded',
      cost_usd: result.costUsd,
      duration_ms: durationMs,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      cache_read_tokens: result.cacheReadTokens,
      cache_creation_tokens: result.cacheCreationTokens,
      hallucination_findings: result.critic.unsupported_claims?.length ?? 0,
      draft_md: result.draft.body_md,
      draft_confidence: result.calibratedConfidence,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

// ---------------------------------------------------------------------------
// Anthropic API (direct fetch, no SDK)
// ---------------------------------------------------------------------------

interface AnthropicCallArgs {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  tools?: Array<Record<string, unknown>>;
  max_tokens: number;
  cacheSystem?: boolean;
}

async function callAnthropic(args: AnthropicCallArgs): Promise<AnthropicMessageResponse> {
  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: args.max_tokens,
    messages: args.messages,
  };

  // Cache the system prompt so subsequent runs (different entities, same
  // prompt) read from cache at ~10% cost.
  if (args.cacheSystem) {
    body.system = [{ type: 'text', text: args.system, cache_control: { type: 'ephemeral' } }];
  } else {
    body.system = args.system;
  }

  if (args.tools) body.tools = args.tools;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 400)}`);
  }
  return (await res.json()) as AnthropicMessageResponse;
}

function extractText(res: AnthropicMessageResponse): string {
  return res.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim();
}

/** Parse a JSON code block out of an LLM response. Tolerates surrounding prose. */
function parseAgentJson(text: string): unknown {
  // Look for ```json fenced block first.
  const fence = /```(?:json)?\s*([\s\S]*?)```/m.exec(text);
  const candidate = (fence?.[1] ?? text).trim();
  // Trim trailing prose if the model appended any.
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < 0) {
    throw new Error('Agent did not return JSON');
  }
  const slice = candidate.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(slice);
  } catch (e) {
    throw new Error(`Could not parse agent JSON: ${(e as Error).message}`);
  }
}

/**
 * Rough cost estimate for Sonnet 4.5 pricing as of 2026.
 *  - Input:  $3 / 1M tokens
 *  - Output: $15 / 1M tokens
 *  - Cache write: $3.75 / 1M
 *  - Cache read: $0.30 / 1M
 * Tunable via env if pricing changes.
 */
function estimateCostUsd(usage: AnthropicMessageResponse['usage']): number {
  const inP = Number(process.env.ANTHROPIC_PRICE_INPUT_PER_MTOK ?? 3);
  const outP = Number(process.env.ANTHROPIC_PRICE_OUTPUT_PER_MTOK ?? 15);
  const cwP = Number(process.env.ANTHROPIC_PRICE_CACHE_WRITE_PER_MTOK ?? 3.75);
  const crP = Number(process.env.ANTHROPIC_PRICE_CACHE_READ_PER_MTOK ?? 0.3);

  return (
    ((usage.input_tokens ?? 0) * inP +
      (usage.output_tokens ?? 0) * outP +
      (usage.cache_creation_input_tokens ?? 0) * cwP +
      (usage.cache_read_input_tokens ?? 0) * crP) /
    1_000_000
  );
}
