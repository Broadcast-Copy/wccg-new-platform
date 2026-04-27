import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DjPortalService } from './dj-portal.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
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
  constructor(private readonly portal: DjPortalService) {}

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

  /** GET /djs/:slug — public-ish DJ profile (basic info + active slots). */
  @Get(':slug')
  publicProfile(@Param('slug') slug: string) {
    return this.portal.publicProfile(slug);
  }
}
