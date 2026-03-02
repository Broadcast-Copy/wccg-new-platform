import { Injectable, Logger } from '@nestjs/common';

export interface NowPlayingData {
  title: string;
  artist: string;
  albumArt: string | null;
  streamName: string;
}

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);
  private cache: { data: NowPlayingData; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 10_000; // 10 seconds

  async getNowPlaying(): Promise<NowPlayingData> {
    // Return cached data if fresh
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL_MS) {
      return this.cache.data;
    }

    try {
      const response = await fetch(
        'https://streamdb7web.securenetsystems.net/player_status_update/WCCG.xml',
        {
          headers: { Accept: 'application/xml, text/xml' },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      const data = this.parseXml(xml);

      this.cache = { data, timestamp: Date.now() };
      return data;
    } catch (error) {
      this.logger.warn(`Failed to fetch now playing: ${error}`);

      // Return cached data even if stale, or fallback
      if (this.cache) {
        return this.cache.data;
      }

      return {
        title: '',
        artist: '',
        albumArt: null,
        streamName: 'WCCG 104.5 FM',
      };
    }
  }

  private parseXml(xml: string): NowPlayingData {
    // Simple XML parsing without external dependency
    const getTag = (tag: string): string => {
      const match = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]><\\/${tag}>`, 's'));
      if (match) return match[1].trim();
      const match2 = xml.match(new RegExp(`<${tag}>(.+?)<\\/${tag}>`, 's'));
      return match2 ? match2[1].trim() : '';
    };

    const title = getTag('title') || getTag('song') || getTag('track');
    const artist = getTag('artist');
    const albumArt = getTag('album_art') || getTag('art') || getTag('picture') || null;
    const streamName = getTag('station') || getTag('callsign') || 'WCCG 104.5 FM';

    return { title, artist, albumArt, streamName };
  }
}
