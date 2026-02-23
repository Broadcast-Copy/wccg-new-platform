export type MixStatus = 'PROCESSING' | 'PUBLISHED' | 'HIDDEN';

export interface DjMix {
  id: string;
  hostId: string;
  uploaderId: string;
  title: string;
  description: string | null;
  audioUrl: string;
  coverImageUrl: string | null;
  duration: number | null;
  genre: string | null;
  tags: string[];
  playCount: number;
  status: MixStatus;
  createdAt: string;
  updatedAt: string;
  /** Populated from joined host data */
  hostName?: string;
}

export interface CreateMixDto {
  hostId: string;
  title: string;
  audioUrl: string;
  description?: string;
  coverImageUrl?: string;
  duration?: number;
  genre?: string;
  tags?: string[];
}

export interface UpdateMixDto {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  duration?: number;
  genre?: string;
  tags?: string[];
  status?: MixStatus;
}
