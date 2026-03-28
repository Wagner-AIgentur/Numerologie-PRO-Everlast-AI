'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Sparkles, Star, Waypoints, CalendarDays } from 'lucide-react';
import PremiumCard from '@/components/ui/PremiumCard';
import GoldButton from '@/components/ui/GoldButton';

const products = [
  { key: 'birthdayCode', icon: Sparkles, price: '9,99€' },
  { key: 'selfRealization', icon: Star, price: '9,99€' },
  { key: 'karmicKnots', icon: Waypoints, price: '9,99€' },
  { key: 'yearForecast', icon: CalendarDays, price: '19,99€' },
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

                  {/* CTA */}
                  <div className="mt-6">
                    <GoldButton
                      href="/pakete#pdf"
                      variant="outline"
                      size="md"
                      className="w-full"
                    >
                      {t('cta')}
                    </GoldButton>
                  </div>
                </PremiumCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
