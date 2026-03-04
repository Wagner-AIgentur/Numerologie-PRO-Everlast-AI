import { adminClient } from '@/lib/supabase/admin';
import { isDemoReviewer } from '@/lib/auth/admin-guard';
import { getAdminT, getDateLocale } from '@/lib/i18n/admin';
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import RecordingAttachForm from './RecordingAttachForm';

export default async function AdminSitzungenPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter } = await searchParams;
  const t = getAdminT(locale);
  const dateLocale = getDateLocale(locale);
  const isDemo = await isDemoReviewer();

  let sessionsQuery = adminClient
    .from('sessions')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false });
  if (isDemo) sessionsQuery = sessionsQuery.eq('is_demo', true);
  const { data: sessions } = await sessionsQuery;

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    scheduled: { label: t.statusScheduled, color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
    completed: { label: t.statusCompleted, color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
    cancelled: { label: t.statusCancelled, color: 'bg-red-500/10 text-red-400', icon: Clock },
    rescheduled: { label: t.statusRescheduled, color: 'bg-blue-500/10 text-blue-400', icon: Clock },
  };

  // Filter sessions
  const filteredSessions = sessions?.filter((s) => {
    if (!filter || filter === 'all') return true;
    if (filter === 'paid') return s.session_type !== 'free' && s.order_id;
    if (filter === 'free') return s.session_type === 'free' || !s.order_id;
    if (filter === 'no-booking') return !s.cal_booking_id && s.order_id;
    return true;
  }) ?? [];

  // Count stats
  const totalCount = sessions?.length ?? 0;
  const paidCount = sessions?.filter((s) => s.session_type !== 'free' && s.order_id).length ?? 0;
  const freeCount = sessions?.filter((s) => s.session_type === 'free' || !s.order_id).length ?? 0;
  const noBookingCount = sessions?.filter((s) => !s.cal_booking_id && s.order_id).length ?? 0;

  const filters = [
    { key: 'all', label: t.allFilter, count: totalCount },
    { key: 'paid', label: t.paidFilter, count: paidCount },
    { key: 'free', label: t.freeFilter, count: freeCount },
    { key: 'no-booking', label: t.noBookingFilter, count: noBookingCount },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-white">{t.allSessionsTitle}</h1>
        <p className="text-white/50 text-sm mt-1">
          {totalCount} {t.sessionsTotal} · {paidCount} {t.paidLabel} · {freeCount} {t.freeLabel}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const isActive = (filter ?? 'all') === f.key;
          return (
            <a
              key={f.key}
              href={`?filter=${f.key}`}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                isActive
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
              }`}
            >
              {f.label} ({f.count})
            </a>
          );
        })}
      </div>

      {filteredSessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 sm:p-12 text-center">
          <Calendar className="h-10 w-10 text-white/20 mx-auto mb-4" strokeWidth={1} />
          <p className="text-white/40">{t.noSessionsCategory}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((s) => {
            const sc = statusConfig[s.status] ?? statusConfig.scheduled;
            const StatusIcon = sc.icon;
            const profile = s.profiles as { full_name: string | null; email: string } | null;
            const isFree = s.session_type === 'free' || !s.order_id;
            const noBooking = !s.cal_booking_id && s.order_id;

            return (
              <div
                key={s.id}
                className={`rounded-2xl border bg-[rgba(15,48,63,0.3)] backdrop-blur-sm p-5 ${
                  noBooking ? 'border-orange-500/30' : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-white font-semibold">
                        {profile?.full_name ?? profile?.email ?? '—'}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${sc.color}`}>
                        <StatusIcon className="h-3 w-3" strokeWidth={2} />
                        {sc.label}
                      </span>
                      {/* Session type badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isFree
                          ? 'bg-white/5 text-white/50 border border-white/10'
                          : 'bg-gold/10 text-gold border border-gold/20'
                      }`}>
                        {isFree ? t.free : t.paid}
                      </span>
                    </div>

                    <p className="text-xs text-white/50">
                      {s.package_type ?? t.consultation}
                      {s.platform && ` · ${s.platform}`}
                      {s.duration_minutes ? ` · ${s.duration_minutes} ${t.minutes}` : ''}
                    </p>

                    {s.scheduled_at ? (
                      <p className="text-sm text-white/70 mt-2">
                        {new Date(s.scheduled_at).toLocaleString(dateLocale, {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    ) : noBooking ? (
                      <p className="text-sm text-orange-400/70 mt-2 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {t.noBookingYet}
                      </p>
                    ) : null}

                    {s.cal_booking_id && (
                      <p className="text-xs text-white/30 mt-1">
                        Cal.com: {s.cal_booking_id}
                      </p>
                    )}
                  </div>
                </div>

                {s.admin_notes && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-white/50 italic">{s.admin_notes}</p>
                  </div>
                )}

                <div className="flex gap-3 mt-4 flex-wrap">
                  {s.meeting_link && (
                    <a
                      href={s.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gold/70 hover:text-gold transition-colors"
                    >
                      {t.meetingLink}
                    </a>
                  )}
                  {s.recording_url && (
                    <a
                      href={s.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
                    >
                      {t.recording}
                    </a>
                  )}
                </div>

                {/* Recording attach form — show for completed sessions without recording */}
                {s.status === 'completed' && !s.recording_url && (
                  <RecordingAttachForm sessionId={s.id} locale={locale} />
                )}

                {/* Also show for scheduled sessions that have been completed but not yet marked */}
                {s.status === 'scheduled' && s.scheduled_at && new Date(s.scheduled_at) < new Date() && !s.recording_url && (
                  <RecordingAttachForm sessionId={s.id} locale={locale} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
