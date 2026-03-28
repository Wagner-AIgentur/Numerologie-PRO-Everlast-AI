'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import GoldButton from '@/components/ui/GoldButton';
import Logo from '@/components/shared/Logo';
import BackgroundOrbs from '@/components/ui/BackgroundOrbs';

function LoginForm() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') ?? '/dashboard';
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isConfirmed = searchParams.get('confirmed') === 'true';
  const reason = searchParams.get('reason');
  const [success] = useState<string | null>(() => {
    if (isConfirmed) {
      return locale === 'de'
        ? 'E-Mail erfolgreich bestätigt! Bitte melde dich jetzt an.'
        : 'Email успешно подтверждён! Теперь войдите в аккаунт.';
    }
    return null;
  });

  // Show prominent toast on email confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast.success(
        locale === 'de'
          ? 'E-Mail bestätigt! Du kannst dich jetzt anmelden.'
          : 'Email подтверждён! Теперь вы можете войти.',
        { duration: 8000 }
      );
    }
  }, [isConfirmed, locale]);
  const [error, setError] = useState<string | null>(() => {
    const err = searchParams.get('error');
    if (err === 'callback') {
      return locale === 'de'
        ? 'E-Mail-Bestätigung fehlgeschlagen. Versuche es erneut.'
        : 'Ошибка подтверждения email. Попробуйте снова.';
    }
    return null;
  });

  const de = locale === 'de';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(de ? 'E-Mail oder Passwort falsch.' : 'Неверный email или пароль.');
        setLoading(false);
        return;
      }

      // Admin users go straight to /admin unless explicitly redirected elsewhere
      if (data.user && redirectTo === '/dashboard') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('crm_status')
          .eq('id', data.user.id)
          .single();

        if (profile?.crm_status === 'admin') {
          router.push(`/${locale}/admin`);
          return;
        }
      }

      router.push(redirectTo);
    } catch {
      setError(de ? 'Netzwerkfehler. Bitte prüfe deine Verbindung.' : 'Ошибка сети. Проверьте подключение.');
      setLoading(false);
    }
  };

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
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/">
              <Logo size="md" />
            </Link>
          </div>

          <div className="rounded-2xl border border-gold/20 bg-[rgba(15,48,63,0.4)] backdrop-blur-sm p-8">
            <h1 className="font-serif text-2xl font-bold text-white text-center mb-2">
              {de ? 'Willkommen zurück' : 'Добро пожаловать'}
            </h1>
            <p className="text-white/50 text-sm text-center mb-8">
              {de ? 'Melde dich in deinem Bereich an' : 'Войдите в личный кабинет'}
            </p>

            {reason === 'checkout' && (
              <div className="mb-5 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3.5 text-sm text-gold/90">
                {de
                  ? 'Registriere dich oder melde dich an, um deine Inhalte in deinem persönlichen Kundenportal zu erhalten. Dort findest du deine PDF-Analysen, Aufzeichnungen und alle Unterlagen.'
                  : 'Добро пожаловать! Все материалы будут доступны в вашем личном кабинете. Пожалуйста, зарегистрируйтесь или войдите, чтобы получить доступ.'}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  {de ? 'E-Mail' : 'Email'}
                </label>
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
                    placeholder="••••••••"
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

              <div className="flex justify-end">
                <Link
                  href="/auth/reset-password"
                  className="text-xs text-gold/70 hover:text-gold transition-colors"
                >
                  {de ? 'Passwort vergessen?' : 'Забыли пароль?'}
                </Link>
              </div>

              <GoldButton type="submit" className="w-full" disabled={loading}>
                {loading ? '...' : (de ? 'Anmelden' : 'Войти')}
              </GoldButton>
            </form>

            <p className="mt-6 text-center text-xs text-white/40">
              {de ? 'Noch kein Konto?' : 'Нет аккаунта?'}{' '}
              <Link
                href={reason === 'checkout'
                  ? `/auth/register?redirectTo=${encodeURIComponent(redirectTo)}&reason=checkout`
                  : '/auth/register'
                }
                className="text-gold/70 hover:text-gold transition-colors"
              >
                {de ? 'Registrieren' : 'Зарегистрироваться'}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<BackgroundOrbs />}>
      <LoginForm />
    </Suspense>
  );
}
