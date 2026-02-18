import { Controller, Get, Param, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MetadataService, SseMessage } from './metadata.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  /**
   * GET /metadata/stream/:streamId — Get current metadata (REST, public).
   */
  @Public()
  @Get('stream/:streamId')
  getCurrentMetadata(@Param('streamId') streamId: string) {
    return this.metadataService.getCurrentMetadata(streamId);
  }

  /**
   * GET /metadata/stream/:streamId/sse — SSE stream of metadata updates (public).
   *
   * The @Sse() decorator tells NestJS to set the correct Content-Type
   * and keep the connection open for Server-Sent Events.
   */
  @Public()
  @Sse('stream/:streamId/sse')
  streamMetadata(@Param('streamId') streamId: string): Observable<SseMessage> {
    return this.metadataService.getMetadataStream(streamId);
  }
}
