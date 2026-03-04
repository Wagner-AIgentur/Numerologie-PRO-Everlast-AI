import { adminClient } from '@/lib/supabase/admin';
import { isDemoReviewer } from '@/lib/auth/admin-guard';
import { getAdminT, getDateLocale } from '@/lib/i18n/admin';
import { Clock, AlertTriangle, CalendarDays, Video } from 'lucide-react';
import Link from 'next/link';
import DashboardShell from '@/components/admin/dashboard/DashboardShell';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getAdminT(locale);
  const isDemo = await isDemoReviewer();

  // Helper: conditionally scope query to demo data
  const demoFilter = <T extends { eq: (col: string, val: boolean) => T }>(q: T) =>
    isDemo ? q.eq('is_demo', true) : q;

  const [
    { count: totalKunden },
    { count: neueAnfragen },
    { count: offeneBestellungen },
    { count: geplanteTermine },
    { data: recentSubmissions },
    { data: recentOrders },
    { data: followUps },
    { data: upcomingSessions },
  ] = await Promise.all([
    demoFilter(adminClient.from('profiles').select('*', { count: 'exact', head: true }).neq('crm_status', 'admin')),
    demoFilter(adminClient.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'new')),
    demoFilter(adminClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid')),
    demoFilter(adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'scheduled')),
    demoFilter(adminClient
      .from('contact_submissions')
      .select('id, name, email, topic, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5)),
    demoFilter(adminClient
      .from('orders')
      .select('id, customer_email, amount_cents, status, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(5)),
    adminClient
      .from('crm_notes')
      .select('id, profile_id, content, follow_up_date, created_at, profiles(full_name, email)')
      .eq('type', 'follow_up')
      .not('follow_up_date', 'is', null)
      .order('follow_up_date', { ascending: true })
      .limit(10),
    demoFilter(adminClient
      .from('sessions')
      .select('id, title, scheduled_at, status, session_type, package_type, platform, meeting_link, profile_id, profiles(full_name, email)')
      .gte('scheduled_at', new Date().toISOString())
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true })
      .limit(5)),
  ]);

  const dateLocale = getDateLocale(locale);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-white">{t.dashboardTitle}</h1>
        <p className="text-white/50 mt-1 text-sm">{t.dashboardSubtitle}</p>
      </div>

      {/* KPI Cards — Live-updating Client Component */}
      <DashboardShell
        initialStats={{
          totalKunden: totalKunden ?? 0,
          neueAnfragen: neueAnfragen ?? 0,
          offeneBestellungen: offeneBestellungen ?? 0,
          geplanteTermine: geplanteTermine ?? 0,
        }}
        locale={locale}
        labels={{
          totalCustomers: t.totalCustomers,
          newInquiries: t.newInquiries,
          paidOrders: t.paidOrders,
          plannedSessions: t.plannedSessions,
        }}
      />

      {/* Upcoming Sessions */}
      <div className="rounded-2xl border border-emerald-500/20 bg-[rgba(15,48,63,0.3)] backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-white">{t.upcomingAppointments}</h2>
          </div>
          <Link href={`/${locale}/admin/sitzungen`} className="text-xs text-gold/70 hover:text-gold transition-colors">
            {t.allSessions}
          </Link>
        </div>
        {!upcomingSessions || upcomingSessions.length === 0 ? (
          <p className="text-white/40 text-sm">{t.noAppointments}</p>
        ) : (
          <div className="space-y-2">
            {upcomingSessions.map((s: any) => {
              const profile = s.profiles as { full_name: string | null; email: string } | null;
              const dateStr = s.scheduled_at
                ? new Date(s.scheduled_at).toLocaleString(dateLocale, {
                    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })
                : '—';
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="shrink-0 text-center w-14">
                    <p className="text-xs font-bold text-emerald-400">{dateStr.split(',')[0]}</p>
                    <p className="text-[10px] text-white/40">{dateStr.split(',')[1]?.trim()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${locale}/admin/kunden/${s.profile_id}`}
                      className="text-sm text-white/80 font-medium hover:text-gold transition-colors truncate block"
                    >
                      {profile?.full_name ?? profile?.email ?? '—'}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.package_type && (
                        <span className="text-[10px] text-white/30">{s.package_type}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        s.session_type === 'free'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-gold/10 text-gold'
                      }`}>
                        {s.session_type === 'free' ? t.free : t.paid}
                      </span>
                    </div>
                  </div>
                  {(s.meeting_link || s.meeting_url) && (
                    <a
                      href={s.meeting_link || s.meeting_url}
                      target="_blank"
                      rel="noopener"
                      className="shrink-0 p-2 rounded-lg text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                      title={t.joinMeeting}
                    >
                      <Video className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Follow-up Reminders */}
      {followUps && followUps.length > 0 && (
        <div className="rounded-2xl border border-purple-500/20 bg-[rgba(15,48,63,0.3)] backdrop-blur-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-purple-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-white">{t.openFollowUps}</h2>
          </div>
          <div className="space-y-2">
            {followUps.map((f: any) => {
              const isOverdue = f.follow_up_date && new Date(f.follow_up_date) < new Date();
              const profile = f.profiles as { full_name: string | null; email: string } | null;
              return (
                <Link
                  key={f.id}
                  href={`/${locale}/admin/kunden/${f.profile_id}`}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:bg-white/[0.02] ${
                    isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-white/5'
                  }`}
                >
                  {isOverdue && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" strokeWidth={1.5} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">
                      {profile?.full_name ?? profile?.email ?? '—'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5 truncate">{f.content}</p>
                  </div>
                  <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-400 font-medium' : 'text-white/30'}`}>
                    {new Date(f.follow_up_date).toLocaleDateString(dateLocale)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contact Submissions */}
        <div className="rounded-2xl border border-white/10 bg-[rgba(15,48,63,0.3)] backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">{t.newContacts}</h2>
            <Link href={`/${locale}/admin/kontakte`} className="text-xs text-gold/70 hover:text-gold transition-colors">
              {t.all}
            </Link>
          </div>
          <div className="space-y-3">
            {recentSubmissions?.length === 0 && (
              <p className="text-white/40 text-sm">{t.noNewInquiries}</p>
            )}
            {recentSubmissions?.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{s.name}</p>
                  <p className="text-xs text-white/40 truncate">{s.email}</p>
                </div>
                <div className="text-right shrink-0">
                  {s.topic && (
                    <span className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full">{s.topic}</span>
                  )}
                  <p className="text-xs text-white/30 mt-1">
                    {new Date(s.created_at ?? '').toLocaleDateString(dateLocale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-white/10 bg-[rgba(15,48,63,0.3)] backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">{t.recentOrders}</h2>
            <Link href={`/${locale}/admin/bestellungen`} className="text-xs text-gold/70 hover:text-gold transition-colors">
              {t.all}
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders?.length === 0 && (
              <p className="text-white/40 text-sm">{t.noOrders}</p>
            )}
            {recentOrders?.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{o.customer_email}</p>
                  <p className="text-xs text-white/40">
                    {(o.metadata as any)?.package_key ?? '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-400">
                    {(o.amount_cents / 100).toFixed(0)} €
                  </p>
                  <p className="text-xs text-white/30">
                    {new Date(o.created_at ?? '').toLocaleDateString(dateLocale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
