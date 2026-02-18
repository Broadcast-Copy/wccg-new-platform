export type FavoriteTargetType = 'STREAM' | 'SHOW';

export interface Favorite {
  id: string;
  userId: string;
  targetType: FavoriteTargetType;
  streamId: string | null;
  showId: string | null;
  createdAt: string;
}

export interface ListeningHistory {
  id: string;
  userId: string;
  streamId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
}
