import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/admin-guard';
import { adminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { pdfDeliveryEmail } from '@/lib/email/templates/pdf-delivery';

/**
 * POST /api/admin/orders/[id]/deliver
 * Svetlana uploads a PDF URL for a pending_pdf order.
 * Creates a deliverable, marks order as paid, emails the customer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePermission('orders.edit');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: orderId } = await params;
  const body = await request.json();
  const { fileUrl, title } = body as { fileUrl?: string; title?: string };

  if (!fileUrl) {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 });
  }

  // Fetch order details
  const { data: order } = await adminClient
    .from('orders')
    .select('id, profile_id, customer_email, metadata, notes')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const locale = ((order.metadata as Record<string, string>)?.locale ?? 'de') as 'de' | 'ru';
  const packageKey = (order.metadata as Record<string, string>)?.package_key ?? '';
  const deliverableTitle = title || (locale === 'de' ? 'PDF-Analyse' : 'PDF-Анализ');

  // Create deliverable entry for customer dashboard
  if (order.profile_id) {
    await adminClient.from('deliverables').upsert({
      profile_id: order.profile_id,
      file_type: 'pdf',
      title: deliverableTitle,
      file_url: fileUrl,
    }, { onConflict: 'profile_id,file_url', ignoreDuplicates: true });
  }

  // Mark order as completed
  await adminClient.from('orders').update({
    status: 'paid',
    notes: `${order.notes ?? ''} | PDF delivered: ${new Date().toISOString()}`,
  }).eq('id', orderId);

  // Send delivery email to customer
  if (order.customer_email) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://numerologie-pro.com';
      const dashboardUrl = `${baseUrl}/${locale}/dashboard/unterlagen`;
      const birthdateStr = (order.metadata as Record<string, string>)?.birthdate ?? '';
      const { subject, html } = pdfDeliveryEmail(locale, birthdateStr, dashboardUrl);

      await sendEmail({
        to: order.customer_email,
        subject,
        html,
        template: 'pdf-delivery',
        profileId: order.profile_id,
      });
    } catch (emailErr) {
      console.error('PDF delivery email failed:', emailErr);
    }
  }

  return NextResponse.json({ success: true });
}
