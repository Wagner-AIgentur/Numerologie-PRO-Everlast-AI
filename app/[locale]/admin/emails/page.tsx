import { adminClient } from '@/lib/supabase/admin';
import { isDemoReviewer } from '@/lib/auth/admin-guard';
import { getAdminT, getDateLocale } from '@/lib/i18n/admin';
import { Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function EmailLogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getAdminT(locale);
  const dateLocale = getDateLocale(locale);
  const isDemo = await isDemoReviewer();

  let emailQuery = adminClient
    .from('email_log')
    .select('*, profiles(id, full_name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (isDemo) emailQuery = emailQuery.eq('is_demo', true);
  const { data: emails } = await emailQuery;

  const allEmails = emails ?? [];

  const statusIcon: Record<string, { icon: typeof CheckCircle; color: string }> = {
    sent: { icon: CheckCircle, color: 'text-blue-400' },
    delivered: { icon: CheckCircle, color: 'text-emerald-400' },
    bounced: { icon: AlertCircle, color: 'text-orange-400' },
    failed: { icon: XCircle, color: 'text-red-400' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-white">{t.emailLogTitle}</h1>
        <p className="text-white/50 text-sm mt-1">
          {t.last} {allEmails.length} {t.lastEmails}
        </p>
      </div>

      {allEmails.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 sm:p-12 text-center">
          <Mail className="h-10 w-10 text-white/20 mx-auto mb-4" strokeWidth={1} />
          <p className="text-white/40">{t.noEmailsYet}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[rgba(15,48,63,0.3)] backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium">{t.status}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium">{t.recipient}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium">{t.subject}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium hidden md:table-cell">{t.template}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium hidden lg:table-cell">{t.date}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium hidden xl:table-cell">{t.profile}</th>
                </tr>
              </thead>
              <tbody>
                {allEmails.map((e) => {
                  const si = statusIcon[e.status] ?? statusIcon.sent;
                  const Icon = si.icon;
                  const profile = e.profiles as { id: string; full_name: string | null } | null;
                  return (
                    <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-4 w-4 ${si.color}`} strokeWidth={1.5} />
                          <span className="text-xs text-white/40 capitalize">{e.status}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-white/70 text-xs">{e.to_email}</td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-white/60 text-xs max-w-[200px] truncate">{e.subject}</td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 hidden md:table-cell">
                        {e.template ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                            {e.template}
                          </span>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-white/40 text-xs hidden lg:table-cell">
                        {new Date(e.created_at ?? '').toLocaleString(dateLocale)}
                      </td>
                      <td className="px-3 sm:px-5 py-2.5 sm:py-3 hidden xl:table-cell">
                        {profile?.id ? (
                          <Link
                            href={`/${locale}/admin/kunden/${profile.id}`}
                            className="text-xs text-gold/60 hover:text-gold transition-colors"
                          >
                            {profile.full_name ?? t.profile} →
                          </Link>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
