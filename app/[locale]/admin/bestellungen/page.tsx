import { adminClient } from '@/lib/supabase/admin';
import { isDemoReviewer } from '@/lib/auth/admin-guard';
import { getAdminT, getDateLocale } from '@/lib/i18n/admin';
import { ShoppingBag } from 'lucide-react';
import PdfDeliverForm from './PdfDeliverForm';

export default async function AdminBestellungenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getAdminT(locale);
  const dateLocale = getDateLocale(locale);
  const isDemo = await isDemoReviewer();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ordersQuery = (adminClient as any)
    .from('orders')
    .select('id, customer_email, amount_cents, currency, status, metadata, notes, created_at, profile_id')
    .order('created_at', { ascending: false });
  if (isDemo) ordersQuery = ordersQuery.eq('is_demo', true);
  const { data: orders } = await ordersQuery as { data: Array<{
      id: string; customer_email: string; amount_cents: number; currency: string;
      status: string; metadata: Record<string, string> | null; notes: string | null; created_at: string; profile_id: string | null;
      profile?: { full_name: string | null; email: string } | null;
    }> | null };

  const statusConfig: Record<string, { label: string; color: string }> = {
    paid: { label: t.statusPaid, color: 'bg-emerald-500/10 text-emerald-400' },
    pending: { label: t.statusPending, color: 'bg-yellow-500/10 text-yellow-400' },
    pending_pdf: { label: '⏳ PDF ожидается', color: 'bg-amber-500/10 text-amber-400' },
    refunded: { label: t.statusRefunded, color: 'bg-blue-500/10 text-blue-400' },
    cancelled: { label: t.statusCancelled, color: 'bg-red-500/10 text-red-400' },
  };

  const totalRevenue = orders
    ?.filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount_cents, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-white">{t.allOrders}</h1>
          <p className="text-white/50 text-sm mt-1">
            {orders?.length ?? 0} {t.ordersRevenue}{' '}
            <span className="text-emerald-400 font-semibold">{(totalRevenue / 100).toFixed(2)} €</span>
          </p>
        </div>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 sm:p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-white/20 mx-auto mb-4" strokeWidth={1} />
          <p className="text-white/40">{t.noOrdersYet}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[rgba(15,48,63,0.3)] backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium">{t.customer}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium hidden md:table-cell">{t.package}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium">{t.amount}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium">{t.status}</th>
                  <th className="text-left px-3 sm:px-5 py-2.5 sm:py-3 text-white/50 font-medium hidden lg:table-cell">{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const sc = statusConfig[o.status] ?? statusConfig.pending;
                  return (
                    <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <p className="text-white font-medium">{o.profile?.full_name ?? '—'}</p>
                        <p className="text-xs text-white/40">{o.customer_email}</p>
                        {o.notes && (
                          <p className="text-xs text-white/30 mt-1">{o.notes}</p>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-white/60 hidden md:table-cell">
                        {(o.metadata as any)?.package_key ?? '—'}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-white font-semibold">
                        {(o.amount_cents / 100).toFixed(2)} €
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color}`}>
                          {sc.label}
                        </span>
                        {o.status === 'pending_pdf' && (
                          <PdfDeliverForm orderId={o.id} />
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-white/40 text-xs hidden lg:table-cell">
                        {new Date(o.created_at).toLocaleString(dateLocale)}
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
