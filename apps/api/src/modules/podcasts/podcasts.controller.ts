import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PodcastsService } from './podcasts.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

@Controller('podcasts')
export class PodcastsController {
  constructor(private readonly podcastsService: PodcastsService) {}

  // ─── Public endpoints ───────────────────────────────────────────

  /**
   * GET /podcasts — List all active podcast series (public).
   */
  @Public()
  @Get()
  findAll(@Query('category') category?: string) {
    return this.podcastsService.findAllSeries({ category });
  }

  /**
   * GET /podcasts/my — List current user's podcast series (any status).
   * IMPORTANT: This route must be defined BEFORE :id to avoid conflict.
   */
  @Get('my')
  findMy(@CurrentUser() user: SupabaseUser) {
    return this.podcastsService.findSeriesByCreator(user.sub);
  }

  /**
   * GET /podcasts/:id — Get a single series with its episodes (public).
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.podcastsService.findSeriesById(id);
  }

  // ─── Authenticated endpoints ────────────────────────────────────

  /**
   * POST /podcasts — Create a new podcast series (authenticated).
   */
  @Post()
  createSeries(
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.podcastsService.createSeries(user.sub, dto);
  }

  /**
   * PATCH /podcasts/:id — Update a podcast series (creator or admin).
   */
  @Patch(':id')
  updateSeries(
    @Param('id') id: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.podcastsService.updateSeries(id, user.sub, dto);
  }

  // ─── Episode endpoints ──────────────────────────────────────────

  /**
   * GET /podcasts/:id/episodes — List episodes for a series (public).
   */
  @Public()
  @Get(':id/episodes')
  findEpisodes(@Param('id') seriesId: string) {
    return this.podcastsService.findEpisodes(seriesId);
  }

  /**
   * POST /podcasts/:id/episodes — Create an episode (authenticated).
   */
  @Post(':id/episodes')
  createEpisode(
    @Param('id') seriesId: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.podcastsService.createEpisode(seriesId, user.sub, dto);
  }

  /**
   * PATCH /podcasts/:seriesId/episodes/:episodeId — Update an episode (authenticated).
   */
  @Patch(':seriesId/episodes/:episodeId')
  updateEpisode(
    @Param('seriesId') seriesId: string,
    @Param('episodeId') episodeId: string,
    @CurrentUser() user: SupabaseUser,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.podcastsService.updateEpisode(seriesId, episodeId, user.sub, dto);
  }

  // ─── Play tracking ──────────────────────────────────────────────

  /**
   * POST /podcasts/episodes/:id/play — Increment play count (public).
   */
  @Public()
  @Post('episodes/:id/play')
  incrementPlay(@Param('id') episodeId: string) {
    return this.podcastsService.incrementEpisodePlayCount(episodeId);
  }
}
