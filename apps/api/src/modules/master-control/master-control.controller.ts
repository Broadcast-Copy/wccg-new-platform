import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MasterControlService } from './master-control.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/**
 * Master Control + EAS routes.
 *
 * Public:
 *   GET  /mcr/on-air                — minimal now-playing payload for ticker
 *
 * Authenticated (operator):
 *   GET  /mcr/dashboard             — full operator dashboard payload
 *   PATCH /mcr/metadata             — update now-playing metadata
 *   PATCH /mcr/operator-note        — change the sticky note
 *   PATCH /mcr/current-dj           — assign / clear the current on-air DJ
 *
 *   GET  /mcr/eas?from=&to=&direction=&limit=
 *   POST /mcr/eas                   — log a new alert (received / originated / test)
 *
 *   GET  /mcr/tests?completed=true|false
 *   POST /mcr/tests/:id/complete    — mark a scheduled RWT/RMT as run
 */
@Controller('mcr')
export class MasterControlController {
  constructor(private readonly mcr: MasterControlService) {}

  // ─── Public ──────────────────────────────────────────────────────────

  @Public()
  @Get('on-air')
  onAir() {
    return this.mcr.publicOnAir();
  }

  // ─── Dashboard ───────────────────────────────────────────────────────

  @Get('dashboard')
  dashboard() {
    return this.mcr.dashboard();
  }

  @Patch('metadata')
  updateMetadata(
    @Body() body: {
      title?: string | null;
      artist?: string | null;
      album?: string | null;
      artUrl?: string | null;
      source?: string | null;
      startedAt?: string | null;
      listeners?: number | null;
      bitrateKbps?: number | null;
      signalStatus?: 'on_air' | 'silent' | 'off_air' | 'unknown' | null;
    },
  ) {
    return this.mcr.updateMetadata(body);
  }

  @Patch('operator-note')
  updateOperatorNote(@Body() body: { note: string | null }) {
    return this.mcr.updateOperatorNote(body?.note ?? null);
  }

  @Patch('current-dj')
  setCurrentDj(@Body() body: { djSlug: string | null; showTitle: string | null }) {
    return this.mcr.assignCurrentDj(body?.djSlug ?? null, body?.showTitle ?? null);
  }

  // ─── EAS logbook ─────────────────────────────────────────────────────

  @Get('eas')
  easList(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mcr.easList({
      from, to, direction,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Post('eas')
  logEas(
    @CurrentUser() user: SupabaseUser,
    @Body() body: {
      direction: 'received' | 'originated' | 'test';
      sameCode?: string;
      eventLabel: string;
      severity?: 'minor' | 'moderate' | 'severe' | 'extreme' | 'test';
      originator?: string;
      fipsCodes?: string[];
      issuedAt?: string;
      receivedAt?: string;
      sentAt?: string;
      expiresAt?: string;
      airedForSeconds?: number;
      messageText?: string;
      audioUrl?: string;
      rawSameBurst?: string;
      source?: string;
      testScheduleId?: string;
      notes?: string;
    },
  ) {
    return this.mcr.logEas(user.sub, body);
  }

  // ─── Test schedule ───────────────────────────────────────────────────

  @Get('tests')
  listTests(@Query('completed') completed?: string) {
    return this.mcr.listTests(completed === 'true' || completed === '1');
  }

  @Post('tests/:id/complete')
  completeTest(
    @CurrentUser() user: SupabaseUser,
    @Param('id') id: string,
    @Body() body: { kind?: 'RWT' | 'RMT'; notes?: string },
  ) {
    return this.mcr.completeTest(user.sub, id, body?.kind ?? 'RWT', body?.notes);
  }
}
