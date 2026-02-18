export interface Show {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Host {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShowEpisode {
  id: string;
  show_id: string;
  title: string;
  description: string | null;
  air_date: string | null;
  duration: number | null;
  audio_url: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface HostInfo {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  is_primary: boolean;
}

export interface ShowWithHosts extends Show {
  hosts: HostInfo[];
}
