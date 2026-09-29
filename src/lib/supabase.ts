import { createClient } from '@supabase/supabase-js';

export const supabaseUrl: string = import.meta.env.PUBLIC_SUPABASE_URL || '';
export const supabaseAnonKey: string = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be configured in your environment.'
  );
}

/**
 * Standard Supabase browser client with persistent session handling.
 * Safe for client-side use with public anonymous credentials.
 * Never use service-role keys here.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'super_admin';
  created_at: string;
}

/**
 * Checks if a given user ID has a valid admin or super_admin record in public.admin_users.
 * Uses the existing RLS policy ("Admins can view admin_users" via is_admin()).
 */
export async function getAdminProfile(userId: string): Promise<AdminUser | null> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id, email, full_name, role, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    if (data.role !== 'admin' && data.role !== 'super_admin') {
      return null;
    }

    return data as AdminUser;
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    return null;
  }
}

/**
 * Validates the current session and ensures the user has active admin privileges.
 */
export async function verifyAdminSession(): Promise<{ user: any; admin: AdminUser } | null> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
      return null;
    }

    const admin = await getAdminProfile(session.user.id);
    if (!admin) {
      return null;
    }

    return { user: session.user, admin };
  } catch (err) {
    console.error('Error verifying admin session:', err);
    return null;
  }
}

/**
 * Signs out the administrator and redirects to /admin/login.
 */
export async function adminSignOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Sign-out error:', err);
  } finally {
    window.location.href = '/admin/login';
  }
}
