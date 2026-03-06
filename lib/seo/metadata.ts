import { Metadata } from 'next';

const BASE_URL = 'https://numerologie-pro.com';

type PageSeo = {
  title: { de: string; ru: string };
  description: { de: string; ru: string };
};

export const PAGE_SEO: Record<string, PageSeo> = {
  home: {
    title: {
      de: 'Pythagoras Psychomatrix Beratung — Swetlana Wagner',
      ru: 'Нумерология по дате рождения — Психоматрица Пифагора',
    },
    description: {
      de: 'Entdecke deine Psychomatrix nach Pythagoras. Kostenloser Numerologie-Rechner + professionelle Beratung. 500+ zufriedene Klienten. Deutsch & Russisch.',
      ru: 'Нумерология по дате рождения онлайн. Бесплатный расчёт квадрата Пифагора + профессиональная консультация нумеролога. 500+ довольных клиентов.',
    },
  },
  rechner: {
    title: {
      de: 'Kostenloser Psychomatrix Rechner',
      ru: 'Квадрат Пифагора — расчёт онлайн',
    },
    description: {
      de: 'Berechne deine Pythagoras-Psychomatrix kostenlos anhand deines Geburtsdatums. 9 Positionen, Linienanalyse und persönliche PDF-Analyse — sofort und ohne Anmeldung.',
      ru: 'Рассчитайте квадрат Пифагора по дате рождения бесплатно. Психоматрица онлайн: 9 позиций, анализ линий и персональная PDF-расшифровка — без регистрации.',
    },
  },
  kompatibilitaet: {
    title: {
      de: 'Partner-Kompatibilität berechnen',
      ru: 'Совместимость по дате рождения',
    },
    description: {
      de: 'Prüfe die numerologische Kompatibilität mit deinem Partner kostenlos. Vergleiche eure Psychomatrix nach Pythagoras und entdecke Stärken und Herausforderungen eurer Beziehung.',
      ru: 'Проверьте совместимость по дате рождения бесплатно. Сравните психоматрицы по Пифагору, узнайте сильные стороны вашей пары и ключи к гармоничным отношениям.',
    },
  },
  pakete: {
    title: {
      de: 'Numerologie-Beratung ab 99€',
      ru: 'Консультация нумеролога от 99€',
    },
    description: {
      de: '4 Beratungspakete: Beziehungsmatrix, Lebensbestimmung, Persönliches Wachstum & Kindermatrix. 90-120 Min. per Zoom oder Telegram. Jetzt Termin buchen ab 99€.',
      ru: 'Консультация нумеролога онлайн от 99€. 4 пакета: Матрица отношений, Предназначение, Личностный рост, Матрица ребёнка. 90-120 мин. через Zoom или Telegram.',
    },
  },
  'ueber-mich': {
    title: {
      de: 'Über Swetlana Wagner',
      ru: 'Обо мне — Сертифицированный нумеролог',
    },
    description: {
      de: 'Swetlana Wagner: Zertifizierte Numerologin mit 10+ Jahren Erfahrung, 11 Zertifikaten und 500+ Beratungen. Spezialisiert auf Pythagoras Psychomatrix — jetzt kennenlernen.',
      ru: 'Светлана Вагнер: Сертифицированный нумеролог с 5+ лет опыта и 500+ консультаций. Специализация — цифровой психоанализ.',
    },
  },
  kontakt: {
    title: {
      de: 'Kontakt & Terminbuchung',
      ru: 'Записаться к нумерологу',
    },
    description: {
      de: 'Kontaktiere Swetlana Wagner für eine persönliche Numerologie-Beratung. Kostenlose 15-Min-Erstberatung verfügbar — buche jetzt per Zoom, Telegram oder Telefon.',
      ru: 'Запишитесь на консультацию нумеролога онлайн. Бесплатная 15-минутная первая консультация. Zoom, Telegram или телефон — Светлана Вагнер ответит лично.',
    },
  },
  zertifikate: {
    title: {
      de: 'Zertifikate & Qualifikationen',
      ru: 'Сертификаты и квалификации',
    },
    description: {
      de: '11 Zertifikate in Numerologie, Psychomatrix und Persönlichkeitsberatung. Nachgewiesene Expertise von Swetlana Wagner — alle Zertifikate im Überblick.',
      ru: '11 сертификатов по нумерологии, психоматрице и консультированию личности. Подтверждённая экспертиза Светланы Вагнер — все сертификаты.',
    },
  },
  'karmic-birthday-code': {
    title: {
      de: 'Karmischer Geburtstags-Code',
      ru: 'Кармический код по дате рождения',
    },
    description: {
      de: 'Entschlüssle deinen karmischen Geburtstags-Code mit einer detaillierten PDF-Analyse. Erfahre, welche karmischen Lektionen in deinem Geburtsdatum verborgen sind.',
      ru: 'Расшифровка кармического кода по дате рождения. Узнайте свои кармические уроки и задачи — детальный PDF-анализ от профессионального нумеролога.',
    },
  },
  'karmic-selfrealization': {
    title: {
      de: 'Selbstverwirklichungs-Code',
      ru: 'Код предназначения',
    },
    description: {
      de: 'Dein persönlicher Selbstverwirklichungs-Code zeigt dir den Weg zu deinem wahren Potential. Karmische Numerologie-Analyse mit PDF-Report und Handlungsempfehlungen.',
      ru: 'Рассчитайте ваш код предназначения по нумерологии. Узнайте своё истинное призвание и путь самореализации — PDF-отчёт с рекомендациями от нумеролога.',
    },
  },
  'karmic-knots': {
    title: {
      de: 'Karmische Knoten',
      ru: 'Кармические узлы нумерология',
    },
    description: {
      de: 'Erkenne deine karmischen Knoten und lerne, wie du energetische Blockaden lösen kannst. Detaillierte Numerologie-Analyse mit persönlichem Lösungsweg.',
      ru: 'Кармические узлы в нумерологии — как распознать и развязать. Определите ваши блоки по дате рождения и получите персональный путь к их разрешению.',
    },
  },
  'karmic-year-forecast': {
    title: {
      de: 'Jahresprognose 2026',
      ru: 'Нумерологический прогноз 2026',
    },
    description: {
      de: 'Deine persönliche Numerologie-Jahresprognose für 2026. Erfahre, welche Chancen und Herausforderungen das Jahr bringt — mit konkreten Handlungsempfehlungen.',
      ru: 'Персональный нумерологический прогноз на 2026 год по дате рождения. Узнайте ваш личный год, его возможности и вызовы — с рекомендациями нумеролога.',
    },
  },
};

export function getPageMetadata(
  pageKey: string,
  locale: string,
  routePath: string
): Metadata {
  const seo = PAGE_SEO[pageKey];
  if (!seo) return {};

  const lang = locale as 'de' | 'ru';
  const otherLocale = lang === 'de' ? 'ru' : 'de';

  return {
    title: seo.title[lang],
    description: seo.description[lang],
    alternates: {
      canonical: `${BASE_URL}/${locale}${routePath}`,
      languages: {
        de: `${BASE_URL}/de${routePath}`,
        ru: `${BASE_URL}/ru${routePath}`,
        uk: `${BASE_URL}/ru${routePath}`,
        'x-default': `${BASE_URL}/de${routePath}`,
      },
    },
    openGraph: {
      title: seo.title[lang],
      description: seo.description[lang],
      url: `${BASE_URL}/${locale}${routePath}`,
      siteName: 'Numerologie PRO',
      locale: lang === 'de' ? 'de_DE' : 'ru_RU',
      alternateLocale: lang === 'de' ? ['ru_RU', 'uk_UA'] : ['de_DE', 'uk_UA'],
      type: 'website',
    },
  };
}
