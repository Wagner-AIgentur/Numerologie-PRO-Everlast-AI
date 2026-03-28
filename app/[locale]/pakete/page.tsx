'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import {
  Heart, Compass, TrendingUp, Baby, Banknote, CalendarRange,
  CalendarDays, Sun, Map, CheckCircle2, Star, Loader2, Clock,
  Video, Info, ListChecks, Trophy, FileText, MessageCircle, Send, X,
} from 'lucide-react';
import PremiumCard from '@/components/ui/PremiumCard';
import GoldButton from '@/components/ui/GoldButton';
import BackgroundOrbs from '@/components/ui/BackgroundOrbs';
import CalBookingButton from '@/components/ui/CalBookingButton';
import { UI_KEY_TO_PACKAGE_KEY, FREE_CONSULTATION_CAL_PATH, type PdfPackageKey } from '@/lib/stripe/products';

const pdfPackages = [
  { key: 'kod_dnya_rozhdeniya' as PdfPackageKey, tKey: 'kodDnyaRozhdeniya', icon: Star },
  { key: 'kod_samorealizacii' as PdfPackageKey, tKey: 'kodSamorealizacii', icon: Compass },
  { key: 'kod_karmicheskogo_uzla' as PdfPackageKey, tKey: 'kodKarmicheskogoUzla', icon: Map },
  { key: 'prognoz_na_god_pdf' as PdfPackageKey, tKey: 'prognozNaGodPdf', icon: CalendarRange },
] as const;

const packages = [
  { key: 'beziehungskarte', icon: Heart, featured: false, hasPdfOption: false },
  { key: 'bestimmung', icon: Compass, featured: true, hasPdfOption: false },
  { key: 'wachstum', icon: TrendingUp, featured: false, hasPdfOption: false },
  { key: 'meinKind', icon: Baby, featured: false, hasPdfOption: false },
  { key: 'geldkanal', icon: Banknote, featured: false, hasPdfOption: false },
  { key: 'jahresprognose', icon: CalendarRange, featured: false, hasPdfOption: true },
  { key: 'monatsprognose', icon: CalendarDays, featured: false, hasPdfOption: false },
  { key: 'tagesprognose', icon: Sun, featured: false, hasPdfOption: false },
  { key: 'lebenskarte', icon: Map, featured: false, hasPdfOption: false },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function PaketePage() {
  const t = useTranslations('packages');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponFromUrl = searchParams.get('coupon') || '';
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const [pdfSelected, setPdfSelected] = useState<Record<string, boolean>>({});
  const [deliveryChannel, setDeliveryChannel] = useState<'telegram' | 'whatsapp'>('telegram');
  const [pdfBirthdate, setPdfBirthdate] = useState('');
  const [pdfPhone, setPdfPhone] = useState('');
  const [openPdfCard, setOpenPdfCard] = useState<string | null>(null);

  // Auto-checkout: when returning from auth with package details in URL
  const autoCheckoutTriggered = useRef(false);
  useEffect(() => {
    if (autoCheckoutTriggered.current) return;
    const autoKey = searchParams.get('auto_checkout');
    if (!autoKey) return;
    autoCheckoutTriggered.current = true;

    const birthdate = searchParams.get('birthdate') || '';
    const phone = searchParams.get('phone') || '';
    const channel = (searchParams.get('channel') as 'telegram' | 'whatsapp') || 'telegram';
    const coupon = searchParams.get('coupon') || couponFromUrl;

    // Fire checkout API directly
    const doCheckout = async () => {
      setLoadingKey(autoKey);
      try {
        const body: Record<string, string> = { packageKey: autoKey, locale };
        if (birthdate) body.birthdate = birthdate;
        if (phone) body.phone = phone;
        if (channel) body.deliveryChannel = channel;
        if (coupon) body.couponCode = coupon;

        const res = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url;
        } else {
          setLoadingKey(null);
          // Clean URL params so user can browse normally
          router.replace(`/${locale}/pakete`);
        }
      } catch {
        setLoadingKey(null);
        router.replace(`/${locale}/pakete`);
      }
    };

    doCheckout();
  }, [searchParams, locale, couponFromUrl, router]);

  function getActiveTab(pkgKey: string) {
    return activeTabs[pkgKey] || 'info';
  }

  function setActiveTab(pkgKey: string, tab: string) {
    setActiveTabs(prev => ({ ...prev, [pkgKey]: tab }));
  }

  function handlePdfCheckout(packageKey: PdfPackageKey) {
    if (!pdfBirthdate || !pdfPhone) return;
    setLoadingKey(packageKey);
    requestAnimationFrame(async () => {
      try {
        const res = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageKey,
            locale,
            birthdate: pdfBirthdate,
            deliveryChannel,
            phone: pdfPhone,
            ...(couponFromUrl && { couponCode: couponFromUrl }),
          }),
        });
        if (res.status === 401) {
          const params = new URLSearchParams({
            auto_checkout: packageKey,
            birthdate: pdfBirthdate,
            phone: pdfPhone,
            channel: deliveryChannel,
          });
          if (couponFromUrl) params.set('coupon', couponFromUrl);
          const paketeUrl = `/${locale}/pakete?${params.toString()}`;
          window.location.href = `/${locale}/auth/login?redirectTo=${encodeURIComponent(paketeUrl)}&reason=checkout`;
          return;
        }
        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url;
        } else {
          setLoadingKey(null);
        }
      } catch {
        setLoadingKey(null);
      }
    });
  }

  function handleCheckout(uiKey: string) {
    let resolvedKey: string = UI_KEY_TO_PACKAGE_KEY[uiKey];
    if (!resolvedKey) return;

    if (uiKey === 'jahresprognose' && pdfSelected[uiKey]) {
      resolvedKey = 'jahresprognose_pdf';
    }

    setLoadingKey(uiKey);

    // Defer fetch to next frame so the browser can paint the loading spinner first
    requestAnimationFrame(async () => {
      try {
        const res = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageKey: resolvedKey, locale, ...(couponFromUrl && { couponCode: couponFromUrl }) }),
        });

        if (res.status === 401) {
          const params = new URLSearchParams({ auto_checkout: resolvedKey });
          if (couponFromUrl) params.set('coupon', couponFromUrl);
          const paketeUrl = `/${locale}/pakete?${params.toString()}`;
          window.location.href = `/${locale}/auth/login?redirectTo=${encodeURIComponent(paketeUrl)}&reason=checkout`;
          return;
        }

        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url;
        } else {
          console.error('Checkout: no URL returned', data);
          setLoadingKey(null);
        }
      } catch (err) {
        console.error('Checkout error:', err);
        setLoadingKey(null);
      }
    });
  }

  return (
    <>
      <BackgroundOrbs />
      <div className="min-h-screen pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-white">
              {t('sectionTitle')}{' '}
              <span className="text-gold">{t('sectionTitleAccent')}</span>
            </h1>
            <p className="mt-4 text-white/70 text-lg max-w-2xl mx-auto whitespace-pre-line">
              {t('sectionSubtitle')}
            </p>
          </motion.div>

          {/* Info badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-wrap justify-center gap-4 mb-14"
          >
            <div className="flex items-center gap-2 rounded-pill border border-gold/20 bg-gold/5 px-5 py-2.5">
              <Clock className="h-4 w-4 text-gold" strokeWidth={1.5} />
              <span className="text-sm text-white/80">{t('duration')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-pill border border-gold/20 bg-gold/5 px-5 py-2.5">
              <Video className="h-4 w-4 text-gold" strokeWidth={1.5} />
              <span className="text-sm text-white/80">Zoom / Telegram</span>
            </div>
          </motion.div>

          {/* Packages grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg, idx) => {
              const Icon = pkg.icon;
              const features = t.raw(`${pkg.key}.features`) as string[];
              const resultsRaw = (() => { try { return t.raw(`${pkg.key}.results`); } catch { return null; } })();
              const results = Array.isArray(resultsRaw) ? resultsRaw as string[] : null;
              const featuresTitle = (() => { try { return t(`${pkg.key}.featuresTitle`); } catch { return null; } })();
              const resultsTitle = (() => { try { return t(`${pkg.key}.resultsTitle`); } catch { return null; } })();
              const pkgDuration = (() => { try { return t(`${pkg.key}.duration`); } catch { return null; } })();
              const isLoading = loadingKey === pkg.key;
              const hasResults = results && results.length > 0;

              const tabs = [
                { id: 'info', label: t('tabInfo'), icon: Info },
                { id: 'features', label: t('tabFeatures'), icon: ListChecks },
                ...(hasResults ? [{ id: 'results', label: t('tabResults'), icon: Trophy }] : []),
              ];
              const active = getActiveTab(pkg.key);

              return (
                <motion.div
                  key={pkg.key}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={idx}
                >
                  <PremiumCard
                    featured={pkg.featured}
                    className="relative flex flex-col h-full p-6"
                  >
                    {/* popular badge */}
                    {pkg.featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-gold-gradient px-4 py-1 text-xs font-bold uppercase tracking-wider text-teal-dark">
                        {t('popular')}
                      </span>
                    )}

                    {/* icon */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-gold/20 bg-gold/10">
                      <Icon className="h-7 w-7 text-gold" strokeWidth={1.5} />
                    </div>

                    {/* title + subtitle */}
                    <h3 className="mt-5 text-xl font-semibold text-white">
                      {t(`${pkg.key}.title`)}
                    </h3>
                    <p className="mt-1 text-sm text-white/60">
                      {t(`${pkg.key}.subtitle`)}
                    </p>

                    {/* Tab navigation */}
                    <div className="mt-4 flex gap-1 rounded-[10px] p-1">
                      {tabs.map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(pkg.key, tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] px-2 py-2 text-xs font-medium transition-all duration-200 ${
                              active === tab.id
                                ? 'bg-gold/15 text-gold shadow-sm'
                                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                            }`}
                          >
                            <TabIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab content — fixed height with scroll indicator */}
                    <div className="mt-3 relative">
                    <div className="h-[220px] overflow-y-auto thin-scrollbar pr-1">
                      <AnimatePresence mode="wait">
                        {active === 'info' && (
                          <motion.div
                            key="info"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="inline-block rounded-pill border border-gold/20 bg-gold/5 px-3 py-1 text-xs text-gold/80">
                              {t(`${pkg.key}.forWhom`)}
                            </span>
                            <p className="mt-3 text-sm text-white/70 leading-relaxed">
                              {t(`${pkg.key}.desc`)}
                            </p>
                          </motion.div>
                        )}

                        {active === 'features' && (
                          <motion.div
                            key="features"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                          >
                            {featuresTitle && (
                              <p className="text-xs font-semibold uppercase tracking-wider text-gold/80 mb-2">{featuresTitle}</p>
                            )}
                            <ul className="space-y-2">
                              {features.map((f) => (
                                <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}

                        {active === 'results' && hasResults && (
                          <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                          >
                            {resultsTitle && (
                              <p className="text-xs font-semibold uppercase tracking-wider text-gold/80 mb-2">{resultsTitle}</p>
                            )}
                            <ul className="space-y-2">
                              {results.map((r) => (
                                <li key={r} className="flex items-start gap-2 text-sm text-white/80">
                                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {/* Bottom fade removed — no visible background artifacts */}
                    </div>

                    {/* Spacer pushes price + button to bottom for consistent alignment */}
                    <div className="mt-auto" />

                    {/* PDF toggle (only jahresprognose) */}
                    {pkg.hasPdfOption && (
                      <div className="mt-4 flex gap-1 rounded-[10px] bg-white/5 p-1">
                        <button
                          onClick={() => setPdfSelected(prev => ({ ...prev, [pkg.key]: false }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] px-2 py-2.5 text-xs font-medium transition-all duration-200 ${
                            !pdfSelected[pkg.key]
                              ? 'bg-gold/15 text-gold shadow-sm'
                              : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <span>{t('withoutPdf')}</span>
                        </button>
                        <button
                          onClick={() => setPdfSelected(prev => ({ ...prev, [pkg.key]: true }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] px-2 py-2.5 text-xs font-medium transition-all duration-200 ${
                            pdfSelected[pkg.key]
                              ? 'bg-gold/15 text-gold shadow-sm'
                              : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>{t('withPdf')}</span>
                        </button>
                      </div>
                    )}

                    {/* price + duration */}
                    <div className="mt-4 flex items-end justify-between">
                      <span className="text-3xl font-bold text-gold">
                        {pkg.hasPdfOption && pdfSelected[pkg.key]
                          ? (() => { try { return t(`${pkg.key}.pricePdf`); } catch { return t(`${pkg.key}.price`); } })()
                          : t(`${pkg.key}.price`)
                        }
                      </span>
                      <span className="rounded-pill border border-gold/20 bg-gold/10 px-3 py-1 text-xs text-gold">
                        {pkgDuration || t('duration')}
                      </span>
                    </div>

                    {/* CTA */}
                    <div className="mt-5">
                      <GoldButton
                        onClick={() => handleCheckout(pkg.key)}
                        variant={pkg.featured ? 'primary' : 'outline'}
                        size="md"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t('book')
                        )}
                      </GoldButton>
                    </div>
                  </PremiumCard>
                </motion.div>
              );
            })}
          </div>

          {/* ═══ PDF-Analysen Sektion ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-20"
          >
            <div className="text-center mb-10">
              <h2 className="font-serif text-2xl md:text-4xl font-bold text-white">
                <FileText className="inline h-8 w-8 text-gold mr-2 -mt-1" strokeWidth={1.5} />
                {t('pdfSectionTitle')}
              </h2>
              <p className="mt-3 text-white/60 text-base max-w-xl mx-auto">
                {t('pdfSectionSubtitle')}
              </p>
            </div>

            {/* PDF packages grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
              {pdfPackages.map((pkg, idx) => {
                const Icon = pkg.icon;
                return (
                  <motion.div
                    key={pkg.key}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={idx}
                  >
                    <PremiumCard
                      className="flex flex-col h-full p-5 cursor-pointer hover:border-gold/40 transition-colors"
                      onClick={() => setOpenPdfCard(pkg.key)}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-gold/20 bg-gold/10">
                        <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white">
                        {t(`${pkg.tKey}.title`)}
                      </h3>
                      <p className="mt-1 text-xs text-white/50 leading-relaxed line-clamp-3">
                        {t(`${pkg.tKey}.desc`)}
                      </p>
                      <div className="mt-auto pt-4">
                        <span className="text-2xl font-bold text-gold">
                          {t(`${pkg.tKey}.price`)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <GoldButton
                          variant="outline"
                          size="sm"
                          className="w-full pointer-events-none"
                        >
                          {t('pdfBuy')}
                        </GoldButton>
                      </div>
                    </PremiumCard>
                  </motion.div>
                );
              })}
            </div>

            {/* PDF Detail Modal */}
            <AnimatePresence>
              {openPdfCard && (() => {
                const activePkg = pdfPackages.find((p) => p.key === openPdfCard);
                if (!activePkg) return null;
                const ActiveIcon = activePkg.icon;
                const isLoading = loadingKey === activePkg.key;
                return (
                  <motion.div
                    key="pdf-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
                    onClick={() => setOpenPdfCard(null)}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      transition={{ duration: 0.25 }}
                      className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gold/20 bg-[rgba(10,35,50,0.95)] backdrop-blur-md p-7"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setOpenPdfCard(null)}
                        className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>

                      <div className="flex items-center gap-4 mb-5">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] border border-gold/20 bg-gold/10">
                          <ActiveIcon className="h-7 w-7 text-gold" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">
                            {t(`${activePkg.tKey}.title`)}
                          </h3>
                          <span className="text-2xl font-bold text-gold">{t(`${activePkg.tKey}.price`)}</span>
                        </div>
                      </div>

                      <p className="text-sm text-white/60 leading-relaxed mb-7">
                        {t(`${activePkg.tKey}.desc`)}
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-white/70 mb-1.5">{t('pdfBirthdate')}</label>
                          <input
                            type="text"
                            placeholder={t('pdfBirthdatePlaceholder')}
                            value={pdfBirthdate}
                            onChange={(e) => setPdfBirthdate(e.target.value)}
                            className="w-full rounded-xl border border-gold/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-white/70 mb-1.5">{t('pdfPhone')}</label>
                          <input
                            type="tel"
                            placeholder={t('pdfPhonePlaceholder')}
                            value={pdfPhone}
                            onChange={(e) => setPdfPhone(e.target.value)}
                            className="w-full rounded-xl border border-gold/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-white/70 mb-1.5">{t('pdfDeliveryLabel')}</label>
                          <div className="flex gap-1 rounded-xl bg-white/5 p-1">
                            <button
                              onClick={() => setDeliveryChannel('telegram')}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all ${
                                deliveryChannel === 'telegram'
                                  ? 'bg-gold/15 text-gold shadow-sm'
                                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                              }`}
                            >
                              <Send className="h-4 w-4" strokeWidth={1.5} />
                              Telegram
                            </button>
                            <button
                              onClick={() => setDeliveryChannel('whatsapp')}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all ${
                                deliveryChannel === 'whatsapp'
                                  ? 'bg-gold/15 text-gold shadow-sm'
                                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                              }`}
                            >
                              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                              WhatsApp
                            </button>
                          </div>
                        </div>

                        <GoldButton
                          onClick={() => handlePdfCheckout(activePkg.key)}
                          variant="primary"
                          size="lg"
                          className="w-full mt-2"
                          disabled={isLoading || !pdfBirthdate || !pdfPhone}
                        >
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>{t('pdfBuy')} — {t(`${activePkg.tKey}.price`)}</>
                          )}
                        </GoldButton>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.div>

          {/* Free consultation CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-20 text-center"
          >
            <div className="rounded-2xl border border-gold/20 bg-[rgba(15,48,63,0.3)] backdrop-blur-sm p-10 max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white uppercase mb-3">
                {t('freeCtaTitle')}{' '}
                <span className="text-gold">{t('freeCtaTitleAccent')}</span>
              </h2>
              <p className="text-white/60 mb-6 whitespace-pre-line">
                {t('freeCtaSubtitle')}
              </p>
              <CalBookingButton calLink={FREE_CONSULTATION_CAL_PATH} size="lg">
                {t('freeCtaButton')}
              </CalBookingButton>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
