export type StreamCategory =
  | 'MAIN'
  | 'GOSPEL'
  | 'HIP_HOP'
  | 'RNB'
  | 'JAZZ'
  | 'TALK'
  | 'SPORTS'
  | 'COMMUNITY';

export type StreamStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface Stream {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: StreamCategory;
  status: StreamStatus;
  sortOrder: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StreamSource {
  id: string;
  streamId: string;
  primaryUrl: string;
  fallbackUrl: string | null;
  mountPoint: string | null;
  format: string;
  bitrate: number;
  centovaAccountId: string | null;
}

export interface StreamMetadata {
  id: string;
  streamId: string;
  currentTitle: string | null;
  currentArtist: string | null;
  currentTrack: string | null;
  albumArt: string | null;
  listenerCount: number;
  isLive: boolean;
  lastUpdated: string;
}

export interface StreamWithDetails extends Stream {
  source: StreamSource | null;
  metadata: StreamMetadata | null;
}
