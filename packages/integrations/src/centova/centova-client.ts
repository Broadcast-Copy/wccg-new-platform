/**
 * Centova Cast API client (stub/mock).
 * Replace with real API calls when credentials are available.
 */

export interface CentovaTrackInfo {
  title: string;
  artist: string;
  album: string | null;
  albumArt: string | null;
  duration: number | null;
  listenUrl: string;
  listenerCount: number;
}

const MOCK_TRACKS: CentovaTrackInfo[] = [
  {
    title: 'Gospel Morning',
    artist: 'WCCG Morning Show',
    album: null,
    albumArt: null,
    duration: null,
    listenUrl: 'https://stream.example.com/wccg',
    listenerCount: 142,
  },
  {
    title: 'Amazing Grace',
    artist: 'Aretha Franklin',
    album: 'Amazing Grace',
    albumArt: null,
    duration: 264,
    listenUrl: 'https://stream.example.com/wccg',
    listenerCount: 156,
  },
  {
    title: 'Total Praise',
    artist: 'Richard Smallwood',
    album: 'Healing',
    albumArt: null,
    duration: 312,
    listenUrl: 'https://stream.example.com/wccg',
    listenerCount: 128,
  },
];

export class CentovaClient {
  private trackIndex = 0;

  constructor(
    private readonly baseUrl?: string,
    private readonly apiKey?: string,
  ) {}

  /**
   * Get current track info for a stream.
   * Returns mock data until real Centova credentials are configured.
   */
  async getCurrentTrack(_accountId: string): Promise<CentovaTrackInfo> {
    if (this.baseUrl && this.apiKey) {
      // TODO: Implement real Centova API call
      // const response = await fetch(`${this.baseUrl}/api/...`);
      // return response.json();
    }

    // Return rotating mock data
    const track = MOCK_TRACKS[this.trackIndex % MOCK_TRACKS.length];
    this.trackIndex++;
    return {
      ...track,
      listenerCount: Math.floor(Math.random() * 200) + 50,
    };
  }
}
