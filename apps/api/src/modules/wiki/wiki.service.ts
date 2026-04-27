import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

interface EnqueueArgs {
  slug: string;
  type: string;
  displayName: string;
  trigger: 'now_playing' | 'manual' | 'staleness' | 'seed';
  priority?: number;
  requestedBy?: string;
}

@Injectable()
export class WikiService {
  private readonly logger = new Logger(WikiService.name);

  constructor(private readonly db: SupabaseDbService) {}

  async list(opts: { type?: string; limit?: number }) {
    let q = this.db.from('wiki_entities')
      .select('slug, type, display_name, cover_url, confidence, last_researched_at')
      .eq('status', 'published')
      .order('last_researched_at', { ascending: false });
    if (opts.type) q = q.eq('type', opts.type);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
    const { data, error } = await q.limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  async getBySlug(slug: string) {
    const { data: entity, error } = await this.db.from('wiki_entities')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!entity) {
      // 404 with a hint that the agent can be triggered.
      throw new NotFoundException({
        message: 'Wiki entry not found',
        slug,
        hint: 'POST /wiki/:slug/research to queue an auto-research run.',
      });
    }

    const [sources, backlinks] = await Promise.all([
      this.db.from('wiki_sources')
        .select('url, title, excerpt, fetched_at')
        .eq('entity_id', entity.id)
        .order('fetched_at', { ascending: false }),
      this.db.from('wiki_links')
        .select('source_slug')
        .eq('target_slug', slug),
    ]);

    return {
      slug: entity.slug,
      type: entity.type,
      displayName: entity.display_name,
      aliases: entity.aliases ?? [],
      bodyMd: entity.body_md ?? null,
      bodyHtml: entity.body_html ?? null,
      coverUrl: entity.cover_url,
      confidence: entity.confidence,
      status: entity.status,
      lastResearchedAt: entity.last_researched_at,
      sources: (sources.data ?? []).map((s: any) => ({
        url: s.url,
        title: s.title,
        excerpt: s.excerpt,
        fetchedAt: s.fetched_at,
      })),
      backlinks: (backlinks.data ?? []).map((b: any) => b.source_slug),
    };
  }

  async search(q: string, limit?: number) {
    if (!q || q.trim().length < 2) return [];
    const lim = Math.min(50, Math.max(1, Number(limit) || 10));
    // Phase B: ilike on display_name. The FTS index in the migration is
    // ready; we'll move to a Postgres function with ts_rank in Phase C.
    const { data, error } = await this.db.from('wiki_entities')
      .select('slug, type, display_name')
      .eq('status', 'published')
      .ilike('display_name', `%${q}%`)
      .limit(lim);
    if (error) throw error;
    return data ?? [];
  }

  async queue() {
    const { data: jobs } = await this.db.from('agent_jobs')
      .select('*')
      .order('priority', { ascending: true })
      .order('next_attempt_at', { ascending: true })
      .limit(50);
    const { data: needsReview } = await this.db.from('wiki_entities')
      .select('slug, type, display_name, confidence, last_researched_at')
      .eq('needs_review', true)
      .order('last_researched_at', { ascending: false })
      .limit(50);
    return {
      jobs: jobs ?? [],
      needsReview: needsReview ?? [],
    };
  }

  /**
   * Enqueue a research job. Idempotent within a 1-hour bucket per (slug, trigger)
   * via the unique dedupe_key — prevents trigger storms (e.g. now-playing
   * spamming the same artist).
   */
  async enqueueResearch(args: EnqueueArgs) {
    if (!args.slug) throw new BadRequestException('slug required');
    const hourBucket = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const dedupeKey = `${args.slug}:${args.trigger}:${hourBucket}`;

    const { error } = await this.db.from('agent_jobs')
      .insert({
        entity_slug: args.slug,
        entity_type: args.type,
        display_name: args.displayName,
        trigger: args.trigger,
        priority: args.priority ?? 5,
        dedupe_key: dedupeKey,
      });

    if (error && (error as any).code === '23505') {
      // Already queued in this bucket — that's fine, return idempotent ack.
      return { ok: true, deduped: true };
    }
    if (error) throw error;
    return { ok: true, deduped: false };
  }

  async watch(userId: string, slug: string) {
    const { error } = await this.db.from('wiki_watchers')
      .upsert({ user_id: userId, slug }, { onConflict: 'user_id,slug' } as any);
    if (error) throw error;
    return { ok: true };
  }

  async approve(slug: string) {
    const { error } = await this.db.from('wiki_entities')
      .update({
        status: 'published',
        needs_review: false,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug);
    if (error) throw error;
    return { ok: true };
  }
}
