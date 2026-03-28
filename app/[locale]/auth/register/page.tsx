'use client';

import { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import GoldButton from '@/components/ui/GoldButton';
import Logo from '@/components/shared/Logo';
import BackgroundOrbs from '@/components/ui/BackgroundOrbs';

function RegisterForm() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const reason = searchParams.get('reason');
  const de = locale === 'de';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !acceptedPrivacy) return;
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError(de ? 'Passwort muss mindestens 8 Zeichen haben.' : 'Пароль должен содержать минимум 8 символов.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, locale, marketingConsent, redirectTo: redirectTo || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (de ? 'Registrierung fehlgeschlagen.' : 'Ошибка регистрации.'));
        setLoading(false);
        return;
      }
    } catch {
      setError(de ? 'Netzwerkfehler. Versuche es erneut.' : 'Ошибка сети. Попробуйте снова.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <>
        <BackgroundOrbs />
        <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-10 sm:py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center"
          >
            <div className="rounded-2xl border border-gold/20 bg-[rgba(15,48,63,0.4)] backdrop-blur-sm p-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 border border-gold/30 mx-auto mb-5">
                <Mail className="h-7 w-7 text-gold" strokeWidth={1.5} />
              </div>
              <h2 className="font-serif text-2xl font-bold text-white mb-3">
                {de ? 'E-Mail bestätigen' : 'Подтвердите email'}
              </h2>
              <p className="text-white/60 text-sm">
                {de
                  ? `Wir haben eine Bestätigungs-E-Mail an ${email} gesendet. Klicke auf den Link, um dein Konto zu aktivieren.`
                  : `Мы отправили письмо на ${email}. Нажмите на ссылку для активации аккаунта.`}
              </p>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <BackgroundOrbs />
      <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-10 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex justify-center mb-8">
            <Link href="/">
              <Logo size="md" />
            </Link>
          </div>

          <div className="rounded-2xl border border-gold/20 bg-[rgba(15,48,63,0.4)] backdrop-blur-sm p-8">
            <h1 className="font-serif text-2xl font-bold text-white text-center mb-2">
              {de ? 'Konto erstellen' : 'Создать аккаунт'}
            </h1>
            <p className="text-white/50 text-sm text-center mb-8">
              {de ? 'Zugang zu deinem persönlichen Bereich' : 'Доступ к личному кабинету'}
            </p>

            {reason === 'checkout' && (
              <div className="mb-5 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3.5 text-sm text-gold/90">
                {de
                  ? 'Erstelle ein Konto, um deine Inhalte in deinem persönlichen Kundenportal zu erhalten. Dort findest du deine PDF-Analysen, Aufzeichnungen und alle Unterlagen.'
                  : 'Добро пожаловать! Все материалы будут доступны в вашем личном кабинете. Пожалуйста, зарегистрируйтесь или войдите, чтобы получить доступ.'}
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  {de ? 'Vollständiger Name' : 'Полное имя'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" strokeWidth={1.5} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={de ? 'Max Mustermann' : 'Иван Иванов'}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">E-Mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" strokeWidth={1.5} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="deine@email.de"
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  {de ? 'Passwort' : 'Пароль'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" strokeWidth={1.5} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 Zeichen"
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-gold accent-gold focus:ring-gold/30"
                />
                <span className="text-xs text-white/50 leading-relaxed">
                  {de ? (
                    <>Ich stimme der <Link href="/datenschutz" className="text-gold/70 hover:text-gold underline" target="_blank">Datenschutzerklärung</Link> zu und bin mit der Verarbeitung meiner Daten einverstanden.</>
                  ) : (
                    <>Я соглашаюсь с <Link href="/datenschutz" className="text-gold/70 hover:text-gold underline" target="_blank">политикой конфиденциальности</Link> и обработкой моих данных.</>
                  )}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-gold accent-gold focus:ring-gold/30"
                />
                <span className="text-xs text-white/50 leading-relaxed">
                  {de
                    ? 'Ich möchte persönliche Numerologie-Tipps und Angebote per E-Mail erhalten. (Optional, jederzeit abbestellbar)'
                    : 'Я хочу получать персональные советы по нумерологии и предложения по email. (Необязательно, можно отписаться в любой момент)'}
                </span>
              </label>

              <GoldButton type="submit" className="w-full" disabled={loading || !acceptedPrivacy}>
                {loading ? '...' : (de ? 'Konto erstellen' : 'Создать аккаунт')}
              </GoldButton>
            </form>

            <p className="mt-6 text-center text-xs text-white/40">
              {de ? 'Bereits ein Konto?' : 'Уже есть аккаунт?'}{' '}
              <Link
                href={reason === 'checkout' && redirectTo
                  ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}&reason=checkout`
                  : '/auth/login'
                }
                className="text-gold/70 hover:text-gold transition-colors"
              >
                {de ? 'Anmelden' : 'Войти'}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<BackgroundOrbs />}>
      <RegisterForm />
    </Suspense>
  );
}
