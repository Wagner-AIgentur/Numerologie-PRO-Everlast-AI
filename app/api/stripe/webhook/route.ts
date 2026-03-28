import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { adminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { orderConfirmationEmail } from '@/lib/email/templates/order-confirmation';
import { pdfDeliveryEmail } from '@/lib/email/templates/pdf-delivery';
import { isPdfPackage } from '@/lib/stripe/products';
import { calculateMatrix } from '@/lib/numerology/calculate';
import { generatePremiumPDF } from '@/lib/numerology/premium-pdf-generator';
import { notifyPdfDelivery } from '@/lib/telegram/notify';
import { notifyPdfDeliveryWA } from '@/lib/whatsapp/notify';
import { triggerSequenceEnrollment } from '@/lib/sequences/enroll';
import { evaluateTagRulesForProfile } from '@/lib/tagging/engine';
import { triggerAutomations } from '@/lib/automation/engine';
import { updateLastActivity } from '@/lib/scoring/engine';
import { addToFeed } from '@/lib/inbox/feed';
import { sendCAPIEvent } from '@/lib/meta/conversions';
import { abandonedCartEmail } from '@/lib/email/templates/abandoned-cart';
import type Stripe from 'stripe';

export const runtime = 'nodejs'; // Important: Puppeteer requires Node.js runtime
export const maxDuration = 60; // Puppeteer PDF generation needs 30-60s

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'checkout.session.expired': {
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(expiredSession);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await adminClient
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('stripe_payment_intent_id', intent.id);
        break;
      }
    }
  } catch (err) {
    // Always return 200 to prevent Stripe retry storms on handler errors
    console.error('Webhook handler error:', err);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { metadata, customer_email, amount_total, currency, payment_intent } = session;
  const profileId = metadata?.profile_id || null;
  const packageKey = metadata?.package_key ?? 'unknown';
  const locale = (metadata?.locale ?? 'de') as 'de' | 'ru';
  const email = customer_email ?? '';

  if (!email) return;

  // Find or create profile
  let resolvedProfileId = profileId && profileId.length > 0 ? profileId : null;

  if (!resolvedProfileId) {
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    resolvedProfileId = existingProfile?.id ?? null;
  }

  // Auto-create profile for guest checkout (ensures order is always linked)
  if (!resolvedProfileId) {
    try {
      const customerName = session.customer_details?.name ?? email.split('@')[0];
      const { data: inviteData } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: customerName, language: locale },
      });

      if (inviteData?.user) {
        resolvedProfileId = inviteData.user.id;
        await adminClient.from('profiles').update({
          full_name: customerName,
          language: locale,
          crm_status: 'client',
        }).eq('id', resolvedProfileId);
        console.log(`Auto-created profile for guest checkout: ${email}`);
      }
    } catch (profileErr) {
      console.error('Auto-create profile failed:', profileErr);
    }
  }

  // Find product in Supabase (prefer package_key, fallback to name match)
  let product = (await adminClient
    .from('products')
    .select('id')
    .eq('package_key', packageKey)
    .single()).data;

  if (!product) {
    console.warn(`Product not found for package_key: ${packageKey}`);
  }

  // Idempotency check — prevent duplicate orders on webhook retries
  const { data: existingOrder } = await adminClient
    .from('orders')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();

  if (existingOrder) {
    console.log(`Order already exists for session ${session.id}, skipping`);
    return;
  }

  // Create order
  const { data: order } = await adminClient
    .from('orders')
    .insert({
      profile_id: resolvedProfileId,
      customer_email: email,
      product_id: product?.id ?? null,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof payment_intent === 'string' ? payment_intent : payment_intent?.id ?? null,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      amount_cents: amount_total ?? 0,
      currency: currency ?? 'eur',
      status: 'paid',
      metadata: { package_key: packageKey, locale },
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  // Add to activity feed (fire-and-forget)
  if (order?.id) {
    const amountFormatted = ((amount_total ?? 0) / 100).toFixed(2);
    addToFeed({
      profileId: resolvedProfileId,
      activityType: 'order',
      sourceTable: 'orders',
      sourceId: order.id,
      title: `${locale === 'de' ? 'Neue Bestellung' : 'Новый заказ'}: ${packageKey}`,
      preview: `${email} — ${amountFormatted} ${(currency ?? 'eur').toUpperCase()}`,
    }).catch(() => {});
  }

  // Send order confirmation email to customer
  const packageNames: Record<string, { de: string; ru: string }> = {
    beziehungsmatrix: { de: 'Beziehungsmatrix', ru: 'Матрица отношений' },
    lebensbestimmung: { de: 'Lebensbestimmung', ru: 'Предназначение' },
    wachstumsplan: { de: 'Wachstumsplan', ru: 'План роста' },
    mein_kind: { de: 'Mein Kind', ru: 'Мой ребёнок' },
    geldkanal: { de: 'Geldkanal', ru: 'Денежный канал' },
    jahresprognose: { de: 'Jahresprognose', ru: 'Прогноз на год' },
    jahresprognose_pdf: { de: 'Jahresprognose + PDF', ru: 'Прогноз на год + PDF' },
    monatsprognose: { de: 'Monatsprognose', ru: 'Прогноз на месяц' },
    tagesprognose: { de: 'Tagesprognose', ru: 'Прогноз на день' },
    lebenskarte: { de: 'Lebenskarte', ru: 'Карта жизни' },
    kod_dnya_rozhdeniya: { de: 'Geburtstagscode', ru: 'Код дня рождения' },
    kod_samorealizacii: { de: 'Selbstverwirklichungscode', ru: 'Код самореализации' },
    kod_karmicheskogo_uzla: { de: 'Karmischer Knotencode', ru: 'Код кармического узла' },
    prognoz_na_god_pdf: { de: 'Jahresprognose PDF', ru: 'Прогноз на год' },
  };

  try {
    const customerName = session.customer_details?.name ?? email.split('@')[0];
    const productName = packageNames[packageKey]?.[locale] ?? packageKey;
    const { subject: orderSubject, html: orderHtml } = orderConfirmationEmail({
      name: customerName,
      productName,
      amount: amount_total ?? 0,
      currency: currency ?? 'eur',
      language: locale,
    });

    await sendEmail({
      to: email,
      subject: orderSubject,
      html: orderHtml,
      template: 'order-confirmation',
      profileId: resolvedProfileId,
    });
  } catch (emailErr) {
    console.error('Order confirmation email failed:', emailErr);
  }

  // Create session placeholder for consultation packages (Cal.com webhook will fill in booking details)
  if (order?.id && !isPdfPackage(packageKey) && packageKey !== 'pdf_analyse' && resolvedProfileId) {
    await adminClient.from('sessions').insert({
      profile_id: resolvedProfileId,
      order_id: order.id,
      package_type: packageKey,
      session_type: 'paid',
      status: 'scheduled',
    });
  }

  // Update lead conversion status
  await adminClient
    .from('leads')
    .update({ converted: true, profile_id: resolvedProfileId })
    .eq('email', email);

  // Track coupon usage if a coupon was applied
  const couponId = metadata?.coupon_id;
  if (couponId && order?.id) {
    try {
      // Increment used_count atomically
      await adminClient.rpc('increment_coupon_usage', { coupon_uuid: couponId });

      // Record usage
      await adminClient.from('coupon_usages').insert({
        coupon_id: couponId,
        order_id: order.id,
        profile_id: resolvedProfileId,
        email,
      });
      // Affiliate commission calculation
      const { data: couponData } = await adminClient
        .from('coupons')
        .select('affiliate_id')
        .eq('id', couponId)
        .single();

      if (couponData?.affiliate_id) {
        try {
          const { data: affiliate } = await adminClient
            .from('affiliates')
            .select('id, commission_percent')
            .eq('id', couponData.affiliate_id)
            .single();

          if (affiliate) {
            const revenueCents = amount_total ?? 0;
            const commissionCents = Math.round(revenueCents * affiliate.commission_percent / 100);
            await adminClient.rpc('record_affiliate_conversion', {
              aff_uuid: affiliate.id,
              p_revenue_cents: revenueCents,
              p_commission_cents: commissionCents,
            });
            console.log(`Affiliate commission: ${commissionCents} cents for affiliate ${affiliate.id}`);
          }
        } catch (affErr) {
          console.error('Affiliate commission tracking failed:', affErr);
        }
      }
    } catch (couponErr) {
      console.error('Coupon usage tracking failed:', couponErr);
    }
  }

  // Manual PDF packages — save phone, notify Svetlana, send confirmation email
  if (isPdfPackage(packageKey) && order?.id) {
    const birthdateStr = metadata?.birthdate ?? '';
    const deliveryChannel = metadata?.delivery_channel || 'telegram';
    const phoneNumber = metadata?.phone ?? '';
    const productName = packageNames[packageKey]?.ru ?? packageKey;
    const productNameLocalized = packageNames[packageKey]?.[locale] ?? packageKey;
    const customerName = session.customer_details?.name ?? email.split('@')[0];

    // Save phone number to profile
    if (resolvedProfileId && phoneNumber) {
      await adminClient.from('profiles').update({
        phone: phoneNumber,
        preferred_channel: deliveryChannel,
      }).eq('id', resolvedProfileId).then(() => {}, () => {});
    }

    // Mark order as pending manual PDF creation
    await adminClient.from('orders').update({
      status: 'pending_pdf',
      notes: `Delivery: ${deliveryChannel} | Phone: ${phoneNumber} | Birthdate: ${birthdateStr}`,
    }).eq('id', order.id).then(() => {}, () => {});

    // Notify Svetlana via Telegram admin chat (always in Russian)
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (adminChatId) {
      try {
        const { sendMessage } = await import('@/lib/telegram/bot');
        const amountFormatted = ((amount_total ?? 0) / 100).toFixed(2);
        await sendMessage({
          chat_id: adminChatId,
          text: [
            `📦 <b>Новый заказ PDF!</b>`,
            ``,
            `👤 <b>Клиент:</b> ${customerName}`,
            `📧 <b>Email:</b> ${email}`,
            `📱 <b>Телефон:</b> ${phoneNumber || '—'}`,
            `🎂 <b>Дата рождения:</b> ${birthdateStr || '—'}`,
            `📋 <b>Пакет:</b> ${productName}`,
            `💰 <b>Сумма:</b> ${amountFormatted}€`,
            `📬 <b>Доставка:</b> ${deliveryChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}`,
            ``,
            `🔗 <b>Order ID:</b> <code>${order.id}</code>`,
            ``,
            `💡 Напишите клиенту на ${deliveryChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} и отправьте PDF после готовности.`,
          ].join('\n'),
        });
      } catch (tgErr) {
        console.error('Admin Telegram notification failed:', tgErr);
      }
    }

    // Send confirmation email to customer (always in Russian for PDF packages)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://numerologie-pro.com';
      const dashboardUrl = `${baseUrl}/${locale}/dashboard/unterlagen`;
      const { pdfOrderConfirmationEmail } = await import('@/lib/email/templates/pdf-order-confirmation');
      const { subject: pdfSubject, html: pdfHtml } = pdfOrderConfirmationEmail({
        name: customerName,
        productName: productNameLocalized,
        dashboardUrl,
        language: locale,
      });
      await sendEmail({
        to: email,
        subject: pdfSubject,
        html: pdfHtml,
        template: 'pdf-order-confirmation',
        profileId: resolvedProfileId,
      });
    } catch (emailErr) {
      console.error('PDF order confirmation email failed:', emailErr);
    }
  }

  // Track referral conversion (if ref code was passed through checkout)
  const refCode = metadata?.referral_code;
  if (refCode && resolvedProfileId) {
    try {
      const { data: referrer } = await adminClient
        .from('profiles')
        .select('id, telegram_chat_id, language')
        .eq('referral_code', refCode)
        .single();

      if (referrer) {
        // Create or update referral entry
        const { data: existingRef } = await adminClient
          .from('referrals')
          .select('id, reward_coupon_id')
          .eq('code', refCode)
          .eq('referred_profile_id', resolvedProfileId)
          .single();

        let referralId: string;
        if (existingRef) {
          await adminClient.from('referrals').update({ status: 'converted' }).eq('id', existingRef.id);
          referralId = existingRef.id;
        } else {
          const { data: newRef } = await adminClient.from('referrals').insert({
            referrer_profile_id: referrer.id,
            referred_profile_id: resolvedProfileId,
            code: refCode,
            status: 'converted',
          }).select('id').single();
          referralId = newRef?.id ?? '';
        }

        // Auto-create 15% reward coupon for the referrer (if not already rewarded)
        if (!existingRef?.reward_coupon_id && referralId) {
          try {
            const rewardCode = `REF${refCode.replace(/[^A-Z0-9]/g, '').slice(0, 6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

            // Sync to Stripe so the coupon actually works at checkout
            let stripeCouponId: string | null = null;
            let stripePromoId: string | null = null;
            try {
              const { createStripeCoupon } = await import('@/lib/stripe/sync-coupon');
              const stripeResult = await createStripeCoupon({
                code: rewardCode,
                type: 'percent',
                value: 15,
                maxUses: 1,
              });
              stripeCouponId = stripeResult.stripe_coupon_id;
              stripePromoId = stripeResult.stripe_promotion_code_id;
            } catch (stripeErr) {
              console.error('Referral coupon Stripe sync failed (coupon will be DB-only):', stripeErr);
            }

            const { data: rewardCoupon } = await adminClient.from('coupons').insert({
              code: rewardCode,
              type: 'percent',
              value: 15,
              max_uses: 1,
              applies_to: 'all',
              purpose: 'referral',
              active: true,
              stripe_coupon_id: stripeCouponId,
              stripe_promotion_code_id: stripePromoId,
            }).select('id').single();

            if (rewardCoupon) {
              await adminClient.from('referrals')
                .update({ reward_coupon_id: rewardCoupon.id })
                .eq('id', referralId);
            }
          } catch (couponGenErr) {
            console.error('Referral reward coupon generation failed:', couponGenErr);
          }
        }

        // Notify referrer via Telegram
        if (referrer.telegram_chat_id) {
          const { sendMessage } = await import('@/lib/telegram/bot');
          const refLocale = (referrer.language ?? 'de') as 'de' | 'ru';

          // Find reward coupon code for the message
          const { data: latestRef } = await adminClient.from('referrals')
            .select('reward_coupon_id, coupons!referrals_reward_coupon_id_fkey(code)')
            .eq('id', referralId)
            .single();
          const rewardCouponCode = (latestRef as unknown as { coupons?: { code: string } })?.coupons?.code ?? '';

          const couponLine = rewardCouponCode
            ? (refLocale === 'de' ? `\n\n🎁 Dein Gutschein: <code>${rewardCouponCode}</code>` : `\n\n🎁 Твой купон: <code>${rewardCouponCode}</code>`)
            : '';

          sendMessage({
            chat_id: referrer.telegram_chat_id,
            text: refLocale === 'de'
              ? `🎉 <b>Deine Empfehlung hat gebucht!</b>\n\nDanke fürs Weiterempfehlen! Du bekommst 15% Rabatt auf deine nächste Bestellung.${couponLine}`
              : `🎉 <b>Твой приглашённый купил!</b>\n\nСпасибо за рекомендацию! Ты получаешь скидку 15% на следующий заказ.${couponLine}`,
          }).catch(() => {});
        }
      }
    } catch (refErr) {
      console.error('Referral tracking failed:', refErr);
    }
  }

  // Trigger sequence enrollment for completed orders (fire-and-forget)
  triggerSequenceEnrollment('order_completed', {
    email,
    profileId: resolvedProfileId,
    metadata: { package_key: packageKey },
  }).catch(() => {});

  // Evaluate auto-tagging rules for this profile (fire-and-forget)
  if (resolvedProfileId) {
    evaluateTagRulesForProfile(resolvedProfileId).catch(() => {});
    updateLastActivity(resolvedProfileId).catch(() => {});
  }

  // Trigger automation rules for order completion (fire-and-forget)
  triggerAutomations('order_completed', {
    profileId: resolvedProfileId,
    email,
    data: { package_key: packageKey, amount_cents: amount_total, currency },
  }).catch(() => {});

  // Send Purchase event to Meta CAPI (fire-and-forget)
  sendCAPIEvent({
    eventName: 'Purchase',
    email,
    profileId: resolvedProfileId,
    customData: {
      currency: currency ?? 'eur',
      value: ((amount_total ?? 0) / 100).toFixed(2),
      content_name: packageKey,
    },
  }).catch(() => {});

  console.log(`Order created for ${email} — ${packageKey}`);
}

/**
 * Generates a PDF, stores it in Supabase, and sends it via email.
 */
async function deliverPDF({
  orderId,
  email,
  birthdate,
  locale,
  profileId,
}: {
  orderId: string;
  email: string;
  birthdate: string;
  locale: 'de' | 'ru';
  profileId: string | null;
}) {
  // Parse birthdate (DD.MM.YYYY)
  const [d, m, y] = birthdate.split('.');
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  const year = parseInt(y, 10);

  if (!day || !month || !year || day > 31 || month > 12 || year < 1900 || year > 2100) {
    throw new Error(`Invalid birthdate: ${birthdate}`);
  }

  // Calculate matrix
  const result = calculateMatrix(day, month, year);

  // Generate PDF buffer with Puppeteer (UTF-8 support for Cyrillic)
  const pdfBuffer = await generatePremiumPDF(result, birthdate, locale);
  const safeBirthdate = birthdate.replace(/\./g, '-');
  const filename = `psychomatrix-${safeBirthdate}.pdf`;

  // Upload to Supabase Storage (deliverables bucket)
  const storagePath = `pdf/${profileId ?? orderId}/${filename}`;
  const { error: uploadError } = await adminClient.storage
    .from('deliverables')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Storage upload failed:', uploadError);
  }

  // Get full public URL for the uploaded file
  const { data: publicUrlData } = adminClient.storage
    .from('deliverables')
    .getPublicUrl(storagePath);
  const fullUrl = publicUrlData?.publicUrl ?? storagePath;

  // Create deliverables entry
  if (profileId) {
    await adminClient.from('deliverables').upsert({
      profile_id: profileId,
      file_type: 'pdf',
      title: locale === 'de' ? 'Psychomatrix PDF-Analyse' : 'PDF-Анализ Психоматрицы',
      file_url: fullUrl,
    }, { onConflict: 'profile_id,file_url', ignoreDuplicates: true });
  }

  // Send email with PDF attachment
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://numerologie-pro.com';
  const dashboardUrl = `${baseUrl}/${locale}/dashboard/unterlagen`;
  const { subject, html } = pdfDeliveryEmail(locale, birthdate, dashboardUrl);

  await sendEmail({
    to: email,
    subject,
    html,
    template: 'pdf-delivery',
    profileId,
    attachments: [{
      filename,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });

  // Deliver via preferred channel (fire-and-forget)
  if (profileId) {
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('preferred_channel')
      .eq('id', profileId)
      .single();

    const channel = profileData?.preferred_channel ?? 'telegram';
    const notifyOpts = {
      profileId,
      title: locale === 'de' ? 'Psychomatrix PDF-Analyse' : 'PDF-Анализ Психоматрицы',
      fileUrl: fullUrl,
      locale,
    };

    if (channel === 'whatsapp') {
      notifyPdfDeliveryWA(notifyOpts).catch(() => {});
    } else {
      notifyPdfDelivery(notifyOpts).catch(() => {});
    }
  }

  console.log(`PDF delivered to ${email} for order ${orderId}`);
}

/**
 * Handles expired checkout sessions (abandoned carts).
 * Sends a recovery email to the customer.
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const email = session.customer_email;
  if (!email) return;

  const packageKey = session.metadata?.package_key ?? '';
  const locale = (session.metadata?.locale ?? 'de') as 'de' | 'ru';
  const profileId = session.metadata?.profile_id || null;

  // Check if the customer already completed a purchase (don't send recovery for successful buyers)
  const { data: existingOrder } = await adminClient
    .from('orders')
    .select('id')
    .eq('customer_email', email)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOrder) {
    console.log(`Skipping abandoned cart for ${email} — already has paid orders`);
    return;
  }

  // Build a checkout URL so the customer can try again
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://numerologie-pro.com';
  const checkoutUrl = `${baseUrl}/${locale}/pakete`;

  try {
    const { subject, html } = abandonedCartEmail({ locale, packageKey, checkoutUrl });

    await sendEmail({
      to: email,
      subject,
      html,
      template: 'abandoned-cart',
      profileId,
    });

    // Log to activity feed
    if (profileId) {
      addToFeed({
        profileId,
        activityType: 'email_sent',
        sourceTable: 'email_log',
        sourceId: profileId,
        title: locale === 'de' ? 'Warenkorbabbruch-Email' : 'Письмо о незавершённой покупке',
        preview: `${packageKey} — Recovery Email`,
      }).catch(() => {});
    }

    console.log(`Abandoned cart recovery email sent to ${email} for ${packageKey}`);
  } catch (err) {
    console.error('Abandoned cart email failed:', err);
  }
}
