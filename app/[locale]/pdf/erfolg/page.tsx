'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { CheckCircle2, FileText } from 'lucide-react';
import BackgroundOrbs from '@/components/ui/BackgroundOrbs';
import GoldButton from '@/components/ui/GoldButton';
import { useLocale } from 'next-intl';

export default function PdfErfolgPage() {
  const t = useTranslations('packages');
  const locale = useLocale();

  return (
    <>
      <BackgroundOrbs />
      <div className="min-h-screen flex items-center justify-center pt-32 pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-md w-full text-center"
        >
          <div className="rounded-2xl border border-gold/20 bg-[rgba(15,48,63,0.4)] backdrop-blur-sm p-10">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-gold" strokeWidth={1.5} />
                </div>
                <FileText className="absolute -bottom-1 -right-1 h-7 w-7 text-gold bg-teal-dark rounded-full p-1" strokeWidth={1.5} />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">
              {t('pdfSuccessTitle')}
            </h1>

            <p className="text-white/60 leading-relaxed mb-8">
              {t('pdfSuccessText')}
            </p>

            <GoldButton
              onClick={() => window.location.href = `/${locale}/dashboard`}
              variant="primary"
              size="md"
              className="w-full"
            >
              {locale === 'de' ? 'Zum Dashboard' : 'Перейти в кабинет'}
            </GoldButton>
          </div>
        </motion.div>
      </div>
    </>
  );
}
