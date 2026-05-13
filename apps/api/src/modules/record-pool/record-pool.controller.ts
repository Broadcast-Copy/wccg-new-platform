import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { RecordPoolService } from './record-pool.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/**
 * Record Pool — a shared library of tracks DJs and labels upload, that DJs
 * grab from for their mixes.
 *
 *   - GET  /pool/tracks                browse (public to signed-in users)
 *   - GET  /pool/tracks/:id            details
 *   - GET  /pool/tracks/:id/download   issue signed URL + log download
 *   - POST /pool/upload                multipart upload (DJs or label owners)
 *   - GET  /pool/me/uploads            my own upload history
 *   - GET  /pool/labels                list verified labels
 *   - GET  /pool/admin/pending         moderation queue
 *   - POST /pool/admin/:id/approve     approve a pending track
 *   - POST /pool/admin/:id/reject      reject (requires reason)
 */
@Controller('pool')
export class RecordPoolController {
  constructor(private readonly pool: RecordPoolService) {}

  @Get('tracks')
  browse(
    @Query('q') q?: string,
    @Query('genre') genre?: string,
    @Query('bpmMin') bpmMin?: string,
    @Query('bpmMax') bpmMax?: string,
    @Query('key') key?: string,
    @Query('version') version?: string,
    @Query('labelId') labelId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sort') sort?: 'newest' | 'popular' | 'title' | 'artist',
  ) {
    return this.pool.browse({
      q, genre, key, version, labelId, sort,
      bpmMin: bpmMin ? Number(bpmMin) : undefined,
      bpmMax: bpmMax ? Number(bpmMax) : undefined,
      limit:  limit  ? Number(limit)  : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('tracks/:id')
  details(@Param('id') id: string) {
    return this.pool.track(id);
  }

  @Get('tracks/:id/download')
  download(
    @CurrentUser() user: SupabaseUser,
    @Param('id') id: string,
    @Req() req: Request,
    @Headers('user-agent') ua?: string,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;
    return this.pool.downloadUrl(user.sub, id, { ip: ip ?? undefined, ua });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: SupabaseUser,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Body() body: {
      title?: string; artist?: string; remixArtist?: string; labelName?: string;
      album?: string; genre?: string; subgenre?: string; bpm?: string; musicalKey?: string;
      releaseYear?: string; releaseDate?: string; version?: string;
      labelId?: string;
    },
  ) {
    if (!file) throw new BadRequestException('file required');
    return this.pool.upload(user.sub, {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      title:        body.title,
      artist:       body.artist,
      remixArtist:  body.remixArtist,
      labelName:    body.labelName,
      album:        body.album,
      genre:        body.genre,
      subgenre:     body.subgenre,
      bpm:          body.bpm ? Number(body.bpm) : undefined,
      musicalKey:   body.musicalKey,
      releaseYear:  body.releaseYear ? Number(body.releaseYear) : undefined,
      releaseDate:  body.releaseDate,
      version:      body.version,
      labelId:      body.labelId,
    });
  }

  @Get('me/uploads')
  myUploads(@CurrentUser() user: SupabaseUser, @Query('limit') limit?: string) {
    return this.pool.myUploads(user.sub, Number(limit) || 30);
  }

  @Public()
  @Get('labels')
  labels() {
    return this.pool.listLabels();
  }

  // ─── Admin moderation ──────────────────────────────────────────────────

  @Get('admin/pending')
  pending(@Query('limit') limit?: string) {
    return this.pool.pendingQueue(Number(limit) || 50);
  }

  @Post('admin/:id/approve')
  approve(@CurrentUser() user: SupabaseUser, @Param('id') id: string) {
    return this.pool.approve(user.sub, id);
  }

  @Post('admin/:id/reject')
  reject(
    @CurrentUser() user: SupabaseUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.pool.reject(user.sub, id, body?.reason);
  }
}
