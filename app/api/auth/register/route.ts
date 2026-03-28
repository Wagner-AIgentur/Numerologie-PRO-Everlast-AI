import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { authConfirmationEmail } from '@/lib/email/templates/auth-confirmation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting to prevent mass account creation / email bombing
    const ip = getClientIp(request);
    if (!await rateLimit(`register:${ip}`, { preset: 'auth' })) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, password, fullName, locale, marketingConsent, redirectTo: clientRedirectTo } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const lang = locale === 'ru' ? 'ru' : 'de';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://numerologie-pro.com';
    // If client passes a redirectTo (e.g. /de/pakete?auto_checkout=...), encode it as ?next= on the callback
    const callbackUrl = new URL(`${siteUrl}/${lang}/auth/callback`);
    if (clientRedirectTo && typeof clientRedirectTo === 'string' && clientRedirectTo.startsWith('/')) {
      callbackUrl.searchParams.set('next', clientRedirectTo);
    }
    const redirectTo = callbackUrl.toString();

    // Generate signup link via admin API — this creates the user WITHOUT sending Supabase's default email
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name: fullName, language: lang },
        redirectTo,
      },
    });

    if (error) {
      console.error('[Auth Register] generateLink error:', error);

      // User already exists — return same success response to prevent email enumeration
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: lang === 'de'
          ? 'Registrierung fehlgeschlagen. Versuche es erneut.'
          : 'Ошибка регистрации. Попробуйте снова.' },
        { status: 500 }
      );
    }

    // Set language + marketing consent on profile
    if (data.user?.id) {
      await adminClient.from('profiles')
        .update({
          language: lang,
          marketing_consent: !!marketingConsent,
          marketing_consent_at: marketingConsent ? new Date().toISOString() : null,
        })
        .eq('id', data.user.id);
    }

    // Extract the verification link
    const confirmUrl = data.properties?.action_link;

    if (!confirmUrl) {
      console.error('[Auth Register] No action_link returned');
      return NextResponse.json(
        { error: 'Failed to generate confirmation link' },
        { status: 500 }
      );
    }

    // Send our branded email via Resend
    const { subject, html } = authConfirmationEmail({
      language: lang,
      confirmUrl,
      userName: fullName,
    });

    const emailResult = await sendEmail({
      to: email,
      subject,
      html,
      template: 'auth-confirmation',
      profileId: data.user?.id ?? null,
    });

    if (!emailResult.success) {
      console.error('[Auth Register] Email send failed:', emailResult.error);
      // User was created but email failed — still return success so they can try resending
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Auth Register] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
