import type { Stream, StreamMetadata } from './stream';
import type { Show, Host } from './show';

export interface ScheduleBlock {
  id: string;
  streamId: string;
  showId: string | null;
  title: string | null;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isOverride: boolean;
  overrideDate: string | null;
  isActive: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LiveNowResult {
  stream: Pick<Stream, 'id' | 'name' | 'slug' | 'imageUrl' | 'category'>;
  show: (Pick<Show, 'id' | 'name' | 'slug' | 'imageUrl'> & { hosts: Pick<Host, 'id' | 'name'>[] }) | null;
  scheduleBlock: Pick<ScheduleBlock, 'id' | 'startTime' | 'endTime'>;
  metadata: Pick<StreamMetadata, 'currentTitle' | 'currentArtist' | 'albumArt'> | null;
  isLive: boolean;
  timeRemaining: number; // minutes
  progress: number; // 0-100
}
