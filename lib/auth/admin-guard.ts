import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { adminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import type { Database } from '@/lib/supabase/types';

/**
 * Internal helper: get authenticated Supabase user from cookies.
 */
async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Verify that the current request is from an authenticated admin user.
 * Returns the user if admin, null otherwise.
 */
export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) return null;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('crm_status')
    .eq('id', user.id)
    .single();

  if (profile?.crm_status !== 'admin') return null;

  return user;
}

/**
 * Verify that the current admin user has a specific permission.
 * Checks the user's team_role_id -> team_roles.permissions array.
 * Owner role ('*') passes every check.
 * Admins without a role assigned are treated as owners (backward compat).
 * Returns the user if authorized, null otherwise.
 */
export async function requirePermission(permission: string) {
  const user = await getAuthUser();
  if (!user) return null;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('crm_status, team_role_id')
    .eq('id', user.id)
    .single();

  if (profile?.crm_status !== 'admin') return null;

  // No role assigned — backward compat: treat as owner (full access)
  if (!profile.team_role_id) return user;

  const { data: role } = await adminClient
    .from('team_roles')
    .select('permissions')
    .eq('id', profile.team_role_id)
    .single();

  if (!role) return null;

  // '*' = wildcard owner permission
  const perms: string[] = role.permissions ?? [];
  if (perms.includes('*') || perms.includes(permission)) return user;

  return null;
}

/**
 * Check if the current authenticated user has the demo_reviewer role.
 * Used to filter out real customer data in API responses and pages.
 */
export async function isDemoReviewer(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('team_role_id')
    .eq('id', user.id)
    .single();

  if (!profile?.team_role_id) return false;

  const { data: role } = await adminClient
    .from('team_roles')
    .select('name')
    .eq('id', profile.team_role_id)
    .single();

  return role?.name === 'demo_reviewer';
}

/**
 * Demo sandbox guard for mutation endpoints.
 * Returns a fake success response (NextResponse) if the current user is a
 * demo reviewer, so the UI appears to work but nothing is persisted.
 * Returns null for normal users → the route continues as usual.
 *
 * Usage in API routes:
 *   const demo = await demoGuard();
 *   if (demo) return demo;
 */
export async function demoGuard(): Promise<Response | null> {
  if (!await isDemoReviewer()) return null;
  const { NextResponse } = await import('next/server');
  return NextResponse.json({ success: true, demo_mode: true });
}

/**
 * Rate-limit admin API requests by client IP.
 * Uses the default preset (10 req / 60s).
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export async function adminRateLimit(request: NextRequest, preset: 'default' | 'strict' = 'default'): Promise<boolean> {
  const ip = getClientIp(request);
  return rateLimit(`admin:${ip}`, { preset });
}
