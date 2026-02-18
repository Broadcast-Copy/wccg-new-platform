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
  sort_order: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreamSource {
  id: string;
  stream_id: string;
  primary_url: string | null;
  fallback_url: string | null;
  mount_point: string | null;
  format: string | null;
  bitrate: number | null;
  centova_account_id: string | null;
}

export interface StreamMetadata {
  id: string;
  stream_id: string;
  current_title: string | null;
  current_artist: string | null;
  current_track: string | null;
  album_art: string | null;
  listener_count: number | null;
  is_live: boolean;
  last_updated: string | null;
}

export interface StreamWithDetails extends Stream {
  stream_source: StreamSource | null;
  stream_metadata: StreamMetadata | null;
}
