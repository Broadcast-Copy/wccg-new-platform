import type { Stream, StreamMetadata } from './stream';
import type { Show, Host } from './show';

export interface ScheduleBlock {
  id: string;
  stream_id: string;
  show_id: string | null;
  title: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  is_override: boolean;
  override_date: string | null;
  is_active: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiveNowResult {
  stream: Pick<Stream, 'id' | 'name' | 'slug' | 'image_url' | 'category'>;
  show: (Pick<Show, 'id' | 'name' | 'slug' | 'image_url'> & { hosts: Pick<Host, 'id' | 'name'>[] }) | null;
  schedule_block: Pick<ScheduleBlock, 'id' | 'start_time' | 'end_time'>;
  metadata: Pick<StreamMetadata, 'current_title' | 'current_artist' | 'album_art'> | null;
  is_live: boolean;
  time_remaining: number; // minutes
  progress: number; // 0-100
}
