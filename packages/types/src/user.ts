export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: 'ADMIN' | 'EDITOR' | 'LISTENER';
  description: string | null;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface UserWithRoles extends Profile {
  roles: Role[];
}
