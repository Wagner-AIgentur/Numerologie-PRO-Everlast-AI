import { adminClient } from '@/lib/supabase/admin';
import { isDemoReviewer } from '@/lib/auth/admin-guard';
import { getAdminT, getDateLocale } from '@/lib/i18n/admin';
import { MessageSquare, Mail } from 'lucide-react';
import ContactStatusButtons from '@/components/admin/crm/ContactStatusButtons';

export default async function KontaktePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getAdminT(locale);
  const dateLocale = getDateLocale(locale);
  const isDemo = await isDemoReviewer();

  let query = adminClient
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (isDemo) query = query.eq('is_demo', true);
  const { data: submissions } = await query;

  const statusConfig: Record<string, { label: string; color: string }> = {
    new: { label: t.statusNew, color: 'bg-yellow-500/10 text-yellow-400' },
    read: { label: t.statusRead, color: 'bg-blue-500/10 text-blue-400' },
    replied: { label: t.statusReplied, color: 'bg-emerald-500/10 text-emerald-400' },
    archived: { label: t.statusArchived, color: 'bg-white/5 text-white/30' },
  };

  const topicMap: Record<string, string> = {
    relationships: t.relationships,
    children: t.children,
    career: t.career,
    growth: t.growth,
  };

  const mailSubject = locale === 'de'
    ? 'Re: Deine Anfrage bei Numerologie PRO'
    : 'Re: Ваш запрос в Numerologie PRO';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-white">{t.contactRequests}</h1>
        <p className="text-white/50 text-sm mt-1">
          {t.contactSubtitle} — {submissions?.length ?? 0} {t.total}.
        </p>
      </div>

      {!submissions || submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 sm:p-12 text-center">
          <MessageSquare className="h-10 w-10 text-white/20 mx-auto mb-4" strokeWidth={1} />
          <p className="text-white/40">{t.noContactsYet}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => {
            const sc = statusConfig[s.status ?? 'new'] ?? statusConfig.new;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-[rgba(15,48,63,0.3)] backdrop-blur-sm p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{s.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`mailto:${s.email}`}
                        className="flex items-center gap-1 text-xs text-gold/70 hover:text-gold transition-colors"
                      >
                        <Mail className="h-3 w-3" strokeWidth={1.5} />
                        {s.email}
                      </a>
                      {s.phone && (
                        <span className="text-xs text-white/40">· {s.phone}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.topic && (
                      <span className="text-xs bg-white/5 text-white/50 px-2 py-1 rounded-full">
                        {topicMap[s.topic] ?? s.topic}
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed border-t border-white/5 pt-3">
                  {s.message}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-white/30">
                    {new Date(s.created_at ?? '').toLocaleString(dateLocale)} · {s.language?.toUpperCase()}
                  </span>
                  <a
                    href={`mailto:${s.email}?subject=${encodeURIComponent(mailSubject)}`}
                    className="text-xs text-gold/60 hover:text-gold transition-colors"
                  >
                    {t.reply}
                  </a>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <ContactStatusButtons contactId={s.id} currentStatus={s.status ?? 'new'} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
