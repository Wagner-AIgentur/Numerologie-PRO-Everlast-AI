import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe/client';
import { PACKAGES, type PackageKey, isPdfPackage } from '@/lib/stripe/products';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({
  packageKey: z.enum([
    'beziehungsmatrix', 'lebensbestimmung', 'wachstumsplan', 'mein_kind',
    'geldkanal', 'jahresprognose', 'jahresprognose_pdf',
    'monatsprognose', 'tagesprognose', 'lebenskarte',
    'kod_dnya_rozhdeniya', 'kod_samorealizacii',
    'kod_karmicheskogo_uzla', 'prognoz_na_god_pdf',
  ]),
  locale: z.enum(['de', 'ru']).default('de'),
  birthdate: z.string().optional(),
  deliveryChannel: z.enum(['whatsapp', 'telegram']).optional(),
  phone: z.string().optional(),
  couponCode: z.string().optional(),
  referralCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit checkout creation to prevent abuse
  const ip = getClientIp(request);
  if (!await rateLimit(`checkout:${ip}`, { preset: 'strict' })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { packageKey, locale, birthdate, deliveryChannel, phone, couponCode, referralCode } = schema.parse(body);
    const pkg = PACKAGES[packageKey as PackageKey];

    const ALLOWED_ORIGINS = [process.env.NEXT_PUBLIC_SITE_URL, 'https://numerologie-pro.com'];
    const requestOrigin = request.headers.get('origin') ?? undefined;
    const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin! : process.env.NEXT_PUBLIC_SITE_URL;

    // Require authentication before checkout
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }

    // Fetch Stripe price ID from Supabase products table (prefer package_key, fallback to name)
    const { data: product } = await adminClient
      .from('products')
      .select('stripe_price_id')
      .eq('package_key', packageKey)
      .single();

    // Build line items — use existing Stripe price or create one on the fly
    const lineItems = product?.stripe_price_id
      ? [{ price: product.stripe_price_id, quantity: 1 }]
      : [
          {
            price_data: {
              currency: pkg.currency,
              unit_amount: pkg.price_cents,
              product_data: {
                name: locale === 'de' ? pkg.name_de : pkg.name_ru,
                description: packageKey === 'pdf_analyse'
                  ? (locale === 'de'
                    ? 'Deine vollständige Psychomatrix als Premium-PDF'
                    : 'Твоя полная психоматрица в формате Premium PDF')
                  : (locale === 'de'
                    ? '90-minütige Numerologie-Beratung per Zoom'
                    : '90-минутная нумерологическая консультация по Zoom'),
              },
            },
            quantity: 1,
          },
        ];

    // Build success/cancel URLs based on package type
    let successUrl: string;
    let cancelUrl: string;

    if (isPdfPackage(packageKey)) {
      // PDF packages: redirect to success page (Svetlana delivers manually)
      successUrl = `${origin}/${locale}/pdf/erfolg?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/${locale}/pakete?payment=cancelled`;
    } else if (pkg.is_consultation) {
      // Consultation packages: redirect to booking success page with Cal.com link
      successUrl = `${origin}/${locale}/buchung/erfolg?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/${locale}/pakete?payment=cancelled`;
    } else {
      successUrl = `${origin}/${locale}/dashboard?payment=success`;
      cancelUrl = `${origin}/${locale}/pakete?payment=cancelled`;
    }

    // Resolve referral code: body param > aff_ref cookie > URL ref param
    const resolvedRefCode = referralCode?.trim()
      || request.cookies.get('aff_ref')?.value
      || '';

    // Resolve coupon to Stripe promotion code if provided
    let stripePromotionCodeId: string | undefined;
    let couponId: string | undefined;

    if (couponCode) {
      const { data: coupon } = await adminClient
        .from('coupons')
        .select('id, stripe_promotion_code_id, active, max_uses, used_count, valid_from, valid_until')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('active', true)
        .single();

      if (coupon) {
        // Validate coupon is still usable before creating checkout session
        const now = new Date();
        const isExpired = coupon.valid_until && new Date(coupon.valid_until) < now;
        const isMaxedOut = coupon.max_uses !== null && (coupon.used_count ?? 0) >= coupon.max_uses;
        const isNotYetValid = coupon.valid_from && new Date(coupon.valid_from) > now;

        if (!isExpired && !isMaxedOut && !isNotYetValid && coupon.stripe_promotion_code_id) {
          stripePromotionCodeId = coupon.stripe_promotion_code_id;
          couponId = coupon.id;
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: user?.email,
      metadata: {
        package_key: packageKey,
        locale,
        profile_id: user?.id ?? '',
        birthdate: birthdate ?? '',
        delivery_channel: deliveryChannel ?? '',
        phone: phone ?? '',
        coupon_code: couponCode ?? '',
        coupon_id: couponId ?? '',
        referral_code: resolvedRefCode,
        cal_link: pkg.cal_link ?? '',
      },
      // If a coupon was resolved, pre-apply it. Otherwise let customer enter codes on Stripe checkout.
      ...(stripePromotionCodeId
        ? { discounts: [{ promotion_code: stripePromotionCodeId }] }
        : { allow_promotion_codes: true }
      ),
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: locale === 'de' ? 'de' : 'ru',
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Stripe checkout error:', errMsg, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
