export interface Show {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Host {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShowEpisode {
  id: string;
  showId: string;
  title: string;
  description: string | null;
  airDate: string;
  duration: number | null;
  audioUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShowWithHosts extends Show {
  hosts: (Host & { isPrimary: boolean })[];
}
