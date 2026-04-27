import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { WikiService } from './wiki.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/**
 * Wiki — Phase C.
 *
 * The vault is the long-term source of truth (Markdown in Git), but Postgres
 * is the read path: published `wiki_entities` rows are projected from the
 * vault on each agent run. This controller serves the public read surface +
 * the staff review queue + the "research this now" enqueue.
 */
@Controller('wiki')
export class WikiController {
  constructor(private readonly wiki: WikiService) {}

  /** GET /wiki — index of recent published entries. Public. */
  @Public()
  @Get()
  list(@Query('type') type?: string, @Query('limit') limit?: number) {
    return this.wiki.list({ type, limit });
  }

  /**
   * GET /wiki/search?q=… — Postgres FTS search. Public.
   */
  @Public()
  @Get('search')
  search(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.wiki.search(q, limit);
  }

  /** GET /wiki/queue — staff review queue (auth, admin/host roles). */
  @Get('queue')
  queue() {
    return this.wiki.queue();
  }

  /** GET /wiki/:slug — single entity, with sources + backlinks. Public. */
  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.wiki.getBySlug(slug);
  }

  /**
   * POST /wiki/:slug/research — enqueue a fresh research run for this entity.
   * Authed users can request, agent runs in background.
   */
  @Post(':slug/research')
  research(
    @CurrentUser() user: SupabaseUser,
    @Param('slug') slug: string,
    @Body() dto?: { type?: string; displayName?: string },
  ) {
    return this.wiki.enqueueResearch({
      slug,
      type: dto?.type ?? 'topic',
      displayName: dto?.displayName ?? slug,
      trigger: 'manual',
      priority: 3,
      requestedBy: user.sub,
    });
  }

  /**
   * POST /wiki/:slug/watch — subscribe the user to be notified when the wiki
   * entry is published or updated.
   */
  @Post(':slug/watch')
  watch(@CurrentUser() user: SupabaseUser, @Param('slug') slug: string) {
    return this.wiki.watch(user.sub, slug);
  }

  /**
   * POST /wiki/:slug/approve — staff approves the current draft, flips status
   * to 'published' and clears needs_review. Should be locked to admin role.
   */
  @Post(':slug/approve')
  approve(@Param('slug') slug: string) {
    return this.wiki.approve(slug);
  }
}
