export type PodcastStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type EpisodeStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface PodcastSeries {
  id: string;
  creatorId: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string | null;
  language: string;
  websiteUrl: string | null;
  rssUrl: string | null;
  isExplicit: boolean;
  status: PodcastStatus;
  subscriberCount: number;
  totalPlays: number;
  tags: string[];
  socialLinks: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  /** Populated from joined creator data */
  creatorName?: string;
}

export interface PodcastEpisode {
  id: string;
  seriesId: string;
  title: string;
  slug: string;
  description: string | null;
  showNotes: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  audioFileSize: number | null;
  coverImageUrl: string | null;
  episodeNumber: number | null;
  seasonNumber: number;
  transcript: string | null;
  guestNames: string[];
  tags: string[];
  status: EpisodeStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  playCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  /** Populated from joined series data */
  seriesTitle?: string;
}

export interface CreatePodcastSeriesDto {
  title: string;
  slug?: string;
  description?: string;
  coverImageUrl?: string;
  category?: string;
  language?: string;
  websiteUrl?: string;
  isExplicit?: boolean;
  tags?: string[];
  socialLinks?: Record<string, string>;
}

export interface UpdatePodcastSeriesDto {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  category?: string;
  language?: string;
  websiteUrl?: string;
  isExplicit?: boolean;
  status?: PodcastStatus;
  tags?: string[];
  socialLinks?: Record<string, string>;
}

export interface CreateEpisodeDto {
  seriesId: string;
  title: string;
  slug?: string;
  description?: string;
  showNotes?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioFileSize?: number;
  coverImageUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  guestNames?: string[];
  tags?: string[];
  scheduledAt?: string;
}

export interface UpdateEpisodeDto {
  title?: string;
  description?: string;
  showNotes?: string;
  audioUrl?: string;
  audioDuration?: number;
  coverImageUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  transcript?: string;
  guestNames?: string[];
  tags?: string[];
  status?: EpisodeStatus;
  scheduledAt?: string;
}
