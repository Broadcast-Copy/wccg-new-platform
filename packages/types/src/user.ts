// ─── User Types & Enums ───────────────────────────────────────────────

export type UserType = 'listener' | 'creator' | 'employee';

export type Department =
  | 'on_air'
  | 'sales'
  | 'production'
  | 'engineering'
  | 'management'
  | 'promotions';

export type CreatorType = 'podcaster' | 'musician' | 'dj';

export type RoleName =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'EDITOR'
  | 'LISTENER'
  | 'CONTENT_CREATOR'
  | 'HOST'
  | 'SALES'
  | 'PRODUCTION'
  | 'ENGINEERING'
  | 'MANAGEMENT'
  | 'PROMOTIONS';

// ─── Interfaces ───────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  user_type: UserType;
  department: Department | null;
  creator_type: CreatorType | null;
  artist_name: string | null;
  employee_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: RoleName;
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
