import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject, interval, map, startWith } from 'rxjs';

/**
 * Represents the current metadata for a stream (now-playing info).
 */
export interface StreamMetadata {
  streamId: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  showName?: string;
  hostName?: string;
  updatedAt: string;
}

/**
 * NestJS SSE message shape (matches what @Sse() expects).
 */
export interface SseMessage {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  /**
   * Per-stream metadata subjects for real-time push.
   * In production, this would be backed by Redis pub/sub.
   */
  private readonly subjects = new Map<string, Subject<StreamMetadata>>();

  /**
   * Get the current metadata for a stream (REST endpoint).
   */
  async getCurrentMetadata(streamId: string): Promise<StreamMetadata> {
    // TODO: Read current metadata from Redis or database
    // For now, return mock data
    this.logger.debug(`Getting metadata for stream ${streamId}`);
    return this.getMockMetadata(streamId);
  }

  /**
   * Get an SSE observable that emits metadata updates for a stream.
   * Uses mock polling at 10-second intervals for the stub.
   */
  getMetadataStream(streamId: string): Observable<SseMessage> {
    this.logger.debug(`SSE subscription for stream ${streamId}`);

    // TODO: Replace with Redis pub/sub subscription
    // Mock: emit current metadata every 10 seconds
    return interval(10_000).pipe(
      startWith(0),
      map(() => {
        const metadata = this.getMockMetadata(streamId);
        return {
          data: metadata,
          type: 'metadata',
        } satisfies SseMessage;
      }),
    );
  }

  /**
   * Push a metadata update to all SSE subscribers for a stream.
   * Called by the metadata polling worker or webhook.
   */
  pushUpdate(streamId: string, metadata: StreamMetadata): void {
    const subject = this.subjects.get(streamId);
    if (subject) {
      subject.next(metadata);
    }
    this.logger.debug(`Pushed metadata update for stream ${streamId}`);
  }

  // ─── Private helpers ──────────────────────────────────────────

  private getMockMetadata(streamId: string): StreamMetadata {
    return {
      streamId,
      title: 'Mock Track Title',
      artist: 'Mock Artist',
      album: 'Mock Album',
      artworkUrl: undefined,
      showName: 'The Morning Show',
      hostName: 'DJ Mock',
      updatedAt: new Date().toISOString(),
    };
  }
}
