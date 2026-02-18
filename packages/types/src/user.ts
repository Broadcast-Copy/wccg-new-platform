export interface Profile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
