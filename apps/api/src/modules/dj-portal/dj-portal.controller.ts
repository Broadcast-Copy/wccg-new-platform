import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UnauthorizedException,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { DjPortalService } from './dj-portal.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/**
 * DJ Portal — scheduled-drop uploads + FTP account management.
 *
 *   - /djs/me              → current user's DJ profile + slots + this-week drops
 *   - /djs/me/upload       → multipart web upload (file + file_code + week_of?)
 *   - /djs/me/ftp          → fetch FTP creds (rotate-on-demand)
 *   - /djs/admin/*         → ops view of who's missing
 *
 * Auth: every endpoint is gated by the global SupabaseAuthGuard.
 */
@Controller('djs')
export class DjPortalController {
  constructor(
    private readonly portal: DjPortalService,
    private readonly config: ConfigService,
  ) {}

  /** GET /djs/me — DJ profile + assigned slots + this week's drop status. */
  @Get('me')
  me(@CurrentUser() user: SupabaseUser) {
    return this.portal.getMe(user.sub);
  }

  /**
   * POST /djs/me/upload — multipart upload of a single mix segment.
   *
   * form-data:
   *   file       — the audio file (mp3 / wav / flac, max 500 MB)
   *   fileCode   — required, e.g. "DJB_76051"; must match this DJ's slot
   *   weekOf     — ISO date (Mon of the week). Optional, defaults to current ET week.
   */
  @Post('me/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  uploadDrop(
    @CurrentUser() user: SupabaseUser,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Body() dto: { fileCode?: string; weekOf?: string },
  ) {
    if (!file) throw new BadRequestException('file required');
    if (!dto?.fileCode) throw new BadRequestException('fileCode required (e.g. DJB_76051)');
    return this.portal.uploadDrop(user.sub, {
      fileCode: dto.fileCode,
      weekOf: dto.weekOf,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      source: 'web',
    });
  }

  /** GET /djs/me/drops?weeks=4 — recent drop history for the current DJ. */
  @Get('me/drops')
  myDrops(
    @CurrentUser() user: SupabaseUser,
    @Query('weeks') weeks?: number,
  ) {
    return this.portal.myDrops(user.sub, Math.max(1, Math.min(26, Number(weeks) || 4)));
  }

  /**
   * GET /djs/me/ftp — show the current FTP credentials and connection info.
   * The password is shown only on first issue or after explicit rotation;
   * after that, the endpoint returns username + host + path with `passwordIssued: false`.
   */
  @Get('me/ftp')
  myFtp(@CurrentUser() user: SupabaseUser) {
    return this.portal.getOrIssueFtp(user.sub, false);
  }

  /** POST /djs/me/ftp/rotate — rotate the FTP password and return the new one once. */
  @Post('me/ftp/rotate')
  rotateFtp(@CurrentUser() user: SupabaseUser) {
    return this.portal.getOrIssueFtp(user.sub, true);
  }

  // ─── Admin ─────────────────────────────────────────────────────────────

  /**
   * GET /djs/admin/missing?weekOf=YYYY-MM-DD — slots/codes missing this week.
   * Returns one row per (slot, file_code, week) that has no uploaded drop.
   */
  @Get('admin/missing')
  missing(@Query('weekOf') weekOf?: string) {
    return this.portal.missingThisWeek(weekOf);
  }

  /** GET /djs/admin/all — list every DJ with their slots and a recency flag. */
  @Get('admin/all')
  allDjs() {
    return this.portal.adminAll();
  }

  /**
   * POST /djs/admin/claim — link an existing DJ slug to a Supabase user_id.
   * Used to onboard a DJ once they sign up.
   */
  @Post('admin/claim')
  claim(@Body() dto: { djSlug: string; userId: string; email?: string }) {
    return this.portal.adminClaim(dto.djSlug, dto.userId, dto.email);
  }

  // ─── Admin slot assignment ─────────────────────────────────────────────

  /** GET /djs/admin/slots — every slot + assigned DJ (or null) + DJ list. */
  @Get('admin/slots')
  adminSlots() {
    return this.portal.adminSlots();
  }

  /**
   * PATCH /djs/admin/slots/:id — assign / reassign / unassign a slot.
   * Body: { djId: string | null }
   */
  @Patch('admin/slots/:id')
  assignSlot(@Param('id') slotId: string, @Body() body: { djId?: string | null }) {
    return this.portal.adminAssignSlot(slotId, body?.djId ?? null);
  }

  // ─── Studio-sync agent (bearer-token, not Supabase JWT) ────────────────

  /**
   * GET /djs/admin/ready — list drops ready for the studio PC to download.
   * Auth: STUDIO_AGENT_TOKEN as `Authorization: Bearer <token>`.
   */
  @Public()
  @Get('admin/ready')
  studioReady(
    @Headers('authorization') auth: string | undefined,
    @Query('limit') limit?: string,
  ) {
    this.requireStudioAgentToken(auth);
    return this.portal.studioReady(Number(limit) || 200);
  }

  /**
   * POST /djs/admin/ready/:id/ack — agent reports successful download.
   * Body: { archivePath?: string; onAirPath?: string; flatPath?: string }
   */
  @Public()
  @Post('admin/ready/:id/ack')
  studioAck(
    @Headers('authorization') auth: string | undefined,
    @Param('id') id: string,
    @Body() body?: { archivePath?: string; onAirPath?: string; flatPath?: string },
  ) {
    this.requireStudioAgentToken(auth);
    return this.portal.studioAck(id, body);
  }

  // ─── Public profile + archive ──────────────────────────────────────────

  /** GET /djs/:slug — public DJ profile (basic info + active slots). */
  @Public()
  @Get(':slug')
  publicProfile(@Param('slug') slug: string) {
    return this.portal.publicProfile(slug);
  }

  /** GET /djs/:slug/archive — list of this DJ's uploaded mixes with playback URLs. */
  @Public()
  @Get(':slug/archive')
  publicArchive(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.portal.publicArchive(slug, Number(limit) || 40);
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private requireStudioAgentToken(authHeader: string | undefined) {
    const configured = this.config.get<string>('STUDIO_AGENT_TOKEN');
    if (!configured) {
      throw new UnauthorizedException('STUDIO_AGENT_TOKEN not configured on server');
    }
    const presented = (authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!presented || presented !== configured) {
      throw new UnauthorizedException('invalid studio agent token');
    }
  }
}
