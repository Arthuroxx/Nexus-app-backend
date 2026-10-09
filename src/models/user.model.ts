export type UserRole = 'cliente' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  passwordHash?: string;
  googleId?: string;
}

export type GymMember = AppUser;
export type User = AppUser;
