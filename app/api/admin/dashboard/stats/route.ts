import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, adminRateLimit, isDemoReviewer } from '@/lib/auth/admin-guard';
import { adminClient } from '@/lib/supabase/admin';
import { cached, CacheTags } from '@/lib/cache';

/**
 * GET /api/admin/dashboard/stats
 * Returns KPI counts for the admin dashboard.
 * Cached for 60 seconds to reduce DB load.
 */
export async function GET(request: NextRequest) {
  const user = await requirePermission('analytics.view');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await adminRateLimit(request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const isDemo = await isDemoReviewer();
  const demoFilter = <T extends { eq: (col: string, val: boolean) => T }>(q: T) =>
    isDemo ? q.eq('is_demo', true) : q;

  try {
    const cacheKey = isDemo ? 'dashboard-stats-demo' : 'dashboard-stats';
    const stats = await cached(
      async () => {
        const [
          { count: totalKunden },
          { count: neueAnfragen },
          { count: offeneBestellungen },
          { count: geplanteTermine },
        ] = await Promise.all([
          demoFilter(adminClient.from('profiles').select('*', { count: 'exact', head: true }).neq('crm_status', 'admin')),
          demoFilter(adminClient.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'new')),
          demoFilter(adminClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid')),
          demoFilter(adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'scheduled')),
        ]);

        return {
          totalKunden: totalKunden ?? 0,
          neueAnfragen: neueAnfragen ?? 0,
          offeneBestellungen: offeneBestellungen ?? 0,
          geplanteTermine: geplanteTermine ?? 0,
        };
      },
      [cacheKey],
      [CacheTags.DASHBOARD],
      60
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
