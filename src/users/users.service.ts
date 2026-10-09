import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getSupabase } from '../supabase/supabase-client';
import type { AppUser } from '../models';

const PUBLIC_COLUMNS = 'id, name, email, role, created_at';
const AUTH_COLUMNS = 'id, name, email, role, created_at, password_hash';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertValidId(id: string) {
  if (!UUID_RE.test(id)) {
    throw new NotFoundException(`User ${id} not found`);
  }
}

@Injectable()
export class UsersService {
  private get supabase() {
    return getSupabase();
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('users')
      .select(PUBLIC_COLUMNS)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AppUser[];
  }

  async findById(id: string) {
    assertValidId(id);
    const { data, error } = await this.supabase
      .from('users')
      .select(PUBLIC_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`User ${id} not found`);
    return data as AppUser;
  }

  private toMember(data: Record<string, unknown>): AppUser {
    return {
      id: data['id'] as string,
      name: data['name'] as string,
      email: data['email'] as string,
      role: data['role'] as AppUser['role'],
      passwordHash: (data['password_hash'] as string | null) ?? undefined,
      googleId: (data['google_id'] as string | null) ?? undefined,
    };
  }

  async findByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select(`${AUTH_COLUMNS}, google_id`)
      .eq('email', normalizeEmail(email))
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.toMember(data);
  }

  async findByGoogleId(googleId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select(`${AUTH_COLUMNS}, google_id`)
      .eq('google_id', googleId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.toMember(data);
  }

  async linkGoogleId(id: string, googleId: string) {
    assertValidId(id);
    const { data, error } = await this.supabase
      .from('users')
      .update({ google_id: googleId })
      .eq('id', id)
      .select(`${AUTH_COLUMNS}, google_id`)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`User ${id} not found`);
    return this.toMember(data);
  }

  async create(data: Omit<AppUser, 'id'>) {
    const email = normalizeEmail(data.email);

    const existing = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing.data) {
      throw new ConflictException('Email already registered');
    }

    const { data: member, error } = await this.supabase
      .from('users')
      .insert({
        name: data.name,
        email,
        role: data.role,
        password_hash: (data as any).passwordHash ?? null,
        google_id: (data as any).googleId ?? null,
      })
      .select(PUBLIC_COLUMNS)
      .single();
    if (error) throw error;
    return member as AppUser;
  }

  async update(id: string, data: Partial<Omit<AppUser, 'id'>>) {
    assertValidId(id);
    const { data: member, error } = await this.supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select(PUBLIC_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!member) throw new NotFoundException(`User ${id} not found`);
    return member as AppUser;
  }

  async remove(id: string) {
    assertValidId(id);
    const { data, error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`User ${id} not found`);
    return { deleted: data.id };
  }
}
