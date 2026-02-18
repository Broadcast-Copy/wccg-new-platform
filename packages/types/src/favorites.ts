export type FavoriteTargetType = 'STREAM' | 'SHOW';

export interface Favorite {
  id: string;
  user_id: string;
  target_type: FavoriteTargetType;
  stream_id: string | null;
  show_id: string | null;
  created_at: string;
}

export interface ListeningHistory {
  id: string;
  user_id: string;
  stream_id: string;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
}
