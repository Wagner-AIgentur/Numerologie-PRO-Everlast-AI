'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, Star, Waypoints, CalendarDays, Send, MessageCircle, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PremiumCard from '@/components/ui/PremiumCard';
import GoldButton from '@/components/ui/GoldButton';
import type { PdfPackageKey } from '@/lib/stripe/products';

const products = [
  { key: 'birthdayCode', packageKey: 'kod_dnya_rozhdeniya' as PdfPackageKey, icon: Sparkles, price: '9,99€' },
  { key: 'selfRealization', packageKey: 'kod_samorealizacii' as PdfPackageKey, icon: Star, price: '9,99€' },
  { key: 'karmicKnots', packageKey: 'kod_karmicheskogo_uzla' as PdfPackageKey, icon: Waypoints, price: '9,99€' },
  { key: 'yearForecast', packageKey: 'prognoz_na_god_pdf' as PdfPackageKey, icon: CalendarDays, price: '19,99€' },
] as const;

const EASE = [0.12, 0.23, 0.5, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.8, ease: EASE },
  }),
};

export default function KarmicProducts() {
  const t = useTranslations('karmicProducts');
  const locale = useLocale();
  const router = useRouter();
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<'telegram' | 'whatsapp'>('telegram');
  const [loading, setLoading] = useState(false);

  async function handleCheckout(packageKey: PdfPackageKey) {
    if (!birthdate || !phone) return;
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageKey,
          locale,
          birthdate,
          deliveryChannel: channel,
          phone,
        }),
      });
      if (res.status === 401) {
        const params = new URLSearchParams({
          auto_checkout: packageKey,
          birthdate,
          phone,
          channel,
        });
        const paketeUrl = `/${locale}/pakete?${params.toString()}`;
        window.location.href = `/${locale}/auth/login?redirectTo=${encodeURIComponent(paketeUrl)}&reason=checkout`;
        return;
      }
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="text-center font-serif text-3xl md:text-4xl font-bold text-white"
        >
          {t('sectionTitle')}{' '}
          <span className="text-gold">{t('sectionTitleAccent')}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          className="mt-4 text-center text-white/70 text-lg max-w-2xl mx-auto"
        >
          {t('sectionSubtitle')}
        </motion.p>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, idx) => {
            const Icon = product.icon;
            const isOpen = openCard === product.key;
            const isLoading = loading && openCard === product.key;

            return (
              <motion.div
                key={product.key}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                custom={idx}
              >
                <PremiumCard className="relative flex flex-col h-full p-6">
                  {/* price badge */}
                  <span className="absolute -top-3 right-4 rounded-pill bg-gold/10 border border-gold/30 px-3 py-1 text-xs font-semibold text-gold">
                    {product.price}
                  </span>

                  {/* icon */}
                  <div className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-gold/20 bg-gold/10">
                    <Icon className="h-7 w-7 text-gold" strokeWidth={1.5} />
                  </div>

                  {/* title */}
                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {t(`${product.key}.title`)}
                  </h3>

                  {/* description */}
                  <p className="mt-2 flex-1 text-sm text-white/60 leading-relaxed">
                    {t(`${product.key}.desc`)}
                  </p>

                  <AnimatePresence mode="wait">
                    {isOpen ? (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="mt-4 space-y-3 overflow-hidden"
                      >
                        <button
                          onClick={() => setOpenCard(null)}
                          className="absolute top-3 left-3 text-white/30 hover:text-white/60 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <input
                          type="text"
                          placeholder={t('birthdatePlaceholder')}
                          value={birthdate}
                          onChange={(e) => setBirthdate(e.target.value)}
                          className="w-full rounded-lg border border-gold/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition"
                        />

                        <input
                          type="tel"
                          placeholder={t('phonePlaceholder')}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-lg border border-gold/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition"
                        />

                        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                          <button
                            onClick={() => setChannel('telegram')}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all ${
                              channel === 'telegram'
                                ? 'bg-gold/15 text-gold'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                          >
                            <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Telegram
                          </button>
                          <button
                            onClick={() => setChannel('whatsapp')}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all ${
                              channel === 'whatsapp'
                                ? 'bg-gold/15 text-gold'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                            WhatsApp
                          </button>
                        </div>

                        <GoldButton
                          onClick={() => handleCheckout(product.packageKey)}
                          variant="primary"
                          size="sm"
                          className="w-full"
                          disabled={isLoading || !birthdate || !phone}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            t('buy')
                          )}
                        </GoldButton>
                      </motion.div>
                    ) : (
                      <motion.div key="cta" className="mt-6">
                        <GoldButton
                          onClick={() => setOpenCard(product.key)}
                          variant="outline"
                          size="md"
                          className="w-full"
                        >
                          {t('cta')}
                        </GoldButton>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </PremiumCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
