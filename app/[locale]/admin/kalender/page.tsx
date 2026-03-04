import { getAdminT } from '@/lib/i18n/admin';
import { isDemoReviewer } from '@/lib/auth/admin-guard';
import { CalendarDays, ExternalLink, Settings } from 'lucide-react';
import { parseICS } from '@/lib/calendar/ics-parser';
import { adminClient } from '@/lib/supabase/admin';
import CalendarView from '@/components/admin/CalendarView';

const ICS_URL = process.env.GOOGLE_CALENDAR_ICS_URL;

/* ── Shared type for unified calendar items ── */
export type CalendarItemType = 'paid' | 'free' | 'personal';

export interface CalendarItem {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  type: CalendarItemType;
  status?: string;
  platform?: string;
  meetingLink?: string;
  customerName?: string;
  packageType?: string;
  durationMinutes?: number;
  description?: string;
  location?: string;
}

/* ── Google Calendar ICS → CalendarItem[] ── */
async function fetchCalendarEvents(): Promise<CalendarItem[] | null> {
  if (!ICS_URL) return null;
  try {
    const res = await fetch(ICS_URL, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const text = await res.text();
    const icsEvents = parseICS(text);
    return icsEvents.map((ev) => ({
      id: ev.uid,
      title: ev.summary,
      start: ev.start,
      end: ev.end,
      allDay: ev.allDay,
      type: 'personal' as const,
      description: ev.description,
      location: ev.location,
    }));
  } catch {
    return [];
  }
}

/* ── Supabase sessions → CalendarItem[] ── */
async function fetchSessions(isDemo: boolean): Promise<CalendarItem[]> {
  try {
    let q = adminClient
      .from('sessions')
      .select('id, title, session_type, scheduled_at, status, package_type, duration_minutes, platform, meeting_link, meeting_url, profiles(full_name, email)')
      .not('scheduled_at', 'is', null)
      .in('status', ['scheduled', 'confirmed', 'completed', 'rescheduled'])
      .order('scheduled_at', { ascending: true });
    if (isDemo) q = q.eq('is_demo', true);
    const { data: sessions } = await q;

    if (!sessions) return [];

    return sessions.map((s: any) => {
      const profile = s.profiles as { full_name: string | null; email: string } | null;
      const isFree = s.session_type === 'free';
      const start = s.scheduled_at as string;
      return {
        id: s.id,
        title: profile?.full_name ?? profile?.email ?? s.title ?? 'Sitzung',
        start,
        end: s.duration_minutes
          ? new Date(new Date(start).getTime() + s.duration_minutes * 60000).toISOString()
          : undefined,
        allDay: false,
        type: isFree ? 'free' as const : 'paid' as const,
        status: s.status,
        platform: s.platform,
        meetingLink: s.meeting_link || s.meeting_url,
        customerName: profile?.full_name ?? profile?.email ?? undefined,
        packageType: s.package_type,
        durationMinutes: s.duration_minutes,
      };
    });
  } catch {
    return [];
  }
}

export default async function KalenderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getAdminT(locale);
  const isDemo = await isDemoReviewer();

  const [icsEvents, sessionItems] = await Promise.all([
    isDemo ? Promise.resolve([]) : fetchCalendarEvents(),
    fetchSessions(isDemo),
  ]);

  // Merge: if ICS not configured but sessions exist, still show sessions
  const hasICS = icsEvents !== null;
  const allItems: CalendarItem[] | null =
    !hasICS && sessionItems.length === 0
      ? null
      : [...(icsEvents ?? []), ...sessionItems].sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-white">{t.calendarTitle}</h1>
          <p className="text-white/50 text-sm mt-1">
            {t.calendarSubtitle}
          </p>
        </div>
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
          {t.openGoogleCalendar}
        </a>
      </div>

      {allItems === null ? (
        /* No ICS URL configured and no sessions — show setup instructions */
        <div className="rounded-2xl border border-dashed border-white/10 p-6 sm:p-12 text-center max-w-2xl mx-auto">
          <CalendarDays className="h-12 w-12 text-white/15 mx-auto mb-4" strokeWidth={1} />
          <h2 className="text-white font-semibold text-lg mb-2">{t.setupCalendar}</h2>
          <p className="text-white/40 text-sm mb-6">
            {t.calendarSetupDesc}
          </p>
          <div className="text-left space-y-4 text-sm">
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold/10 text-gold text-xs flex items-center justify-center font-bold">1</span>
              <p className="text-white/60">
                <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener" className="text-gold/70 hover:text-gold">{t.calendarStep1}</a>
              </p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold/10 text-gold text-xs flex items-center justify-center font-bold">2</span>
              <p className="text-white/60">
                {t.calendarStep2}
              </p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold/10 text-gold text-xs flex items-center justify-center font-bold">3</span>
              <p className="text-white/60">
                {t.calendarStep3}
              </p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold/10 text-gold text-xs flex items-center justify-center font-bold">4</span>
              <div className="text-white/60">
                <p>{t.calendarStep4}</p>
                <code className="block mt-1 text-xs bg-white/5 rounded-lg px-3 py-2 text-gold/80">
                  GOOGLE_CALENDAR_ICS_URL = https://calendar.google.com/calendar/ical/YOUR_EMAIL/private-XXXXX/basic.ics
                </code>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold/10 text-gold text-xs flex items-center justify-center font-bold">5</span>
              <p className="text-white/60">
                {t.calendarStep5}
              </p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 justify-center text-xs text-white/30">
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t.calendarPrivacyNote}
            </div>
          </div>
        </div>
      ) : (
        <CalendarView items={allItems} locale={locale} />
      )}
    </div>
  );
}
