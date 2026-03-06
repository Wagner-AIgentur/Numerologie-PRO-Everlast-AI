/**
 * Karmic Knots Code PDF Generator — V3 (10-page layout)
 *
 * Product 3: Karmic debts, character patterns from past lives,
 * and psychological challenges.
 *
 * Pages:
 *  1. Cover (with formula breakdown)
 *  2. Intro — What karmic knots are
 *  3. Arcana description + image
 *  4. Karmic debts
 *  5. Character patterns from past lives
 *  6. Psychological patterns
 *  7. Resolution + Health + Cross-sell
 *  8. Thank-you + Social
 */

import { calculateKarmicKnotsCode, type KarmicKnotsResult } from './calculate';
import {
  COLORS,
  COVER_PHOTO,
  type Locale,
  splitTraits,
  renderPdf,
  coverPage,
  pageFrame,
  pageHeader,
  pageFooter,
  arcanaCardHtml,
  generateThankYouPage,
} from './pdf-shared';
import { getDateLocale } from '@/lib/i18n/admin';

const T = {
  de: {
    coverTitle: 'KARMISCHER-KNOTEN-CODE',
    coverSubtitle: 'Karmische Numerologie — deine karmischen Schulden und Lösungswege',
    preparedFor: 'Erstellt für',
    birthdate: 'Geburtsdatum',
    arcanaLabel: 'Arkana',
    createdOn: 'Erstellt am',
    formulaLabel: 'Berechnung:',
    productName: 'Karmischer-Knoten-Code',

    introTitle: 'Deine karmischen Knoten',
    introP1: (name: string, num: number) =>
      `Karmische Knoten sind Schulden aus vergangenen Leben, die du in dieses Leben mitgebracht hast. Sie manifestieren sich als wiederkehrende Probleme, schwierige Beziehungsmuster und innere Blockaden. Dein karmischer Knoten mit der Arkana ${num} (${name}) zeigt, welche Lektionen das Universum für dich bereithält.`,
    introP2: 'Das Erkennen dieser Muster ist der erste Schritt zur Auflösung. Solange du deine karmischen Knoten nicht bewusst wahrnimmst, wiederholen sich die gleichen Situationen immer wieder.',
    introHighlight: 'Karmische Knoten sind keine Bestrafung — sie sind Lernmöglichkeiten. Jeder aufgelöste Knoten bringt dich näher an deine wahre Bestimmung.',

    arcanaTitle: (num: number, name: string) => `${num}. Arkanum — ${name}`,
    arcanaIntro: (num: number, name: string, meaning: string) =>
      `Dein karmischer Knoten entspricht der Arkana ${name} (${num}). ${meaning}`,

    debtsTitle: 'Deine karmischen Schulden',
    debtsIntro: (name: string) =>
      `Die folgenden karmischen Schulden sind mit der Energie der Arkana ${name} verbunden. Sie stammen aus vergangenen Inkarnationen.`,

    charTitle: 'Charaktermuster aus früheren Leben',
    charIntro: (name: string) =>
      `Diese Charaktereigenschaften hast du aus früheren Leben mitgebracht. Sie sind tief in deinem Unterbewusstsein verankert. Die Energie der Arkana ${name} im Minus offenbart diese Schattenseiten.`,

    psychTitle: 'Psychologische Muster',
    psychIntro: (name: string) =>
      `Die folgenden psychologischen Muster liegen tief in deinem Unterbewusstsein und beeinflussen dein Verhalten und deine Beziehungen.`,
    psychImportant: 'Achtung:',

    resolveTitle: 'Wie du dein Karma auflöst',
    resolveIntro: 'Die Auflösung deines Karmas ist die wichtigste Wachstumsrichtung in diesem Leben. Es geht darum, bewusst an deinen Mustern zu arbeiten und Schritt für Schritt in die positive Manifestation zu kommen.',
    resolveFollowup: 'Alte Muster verlieren ihre Macht über dich, und neue Möglichkeiten öffnen sich — in Beziehungen, im Beruf und in deiner spirituellen Entwicklung.',
    healthLabel: 'Achte auf deine Gesundheit:',

    crossSellTitle: 'Entdecke das vollständige Bild',
    crossSellIntro: 'Der Karmischer-Knoten-Code ist nur eine Schicht deiner karmischen Karte.',
    cs1Title: 'Geburtstags-Code',
    cs1Desc: 'Welche Talente und Qualitäten hast du aus vergangenen Leben mitgebracht?',
    cs2Title: 'Selbstverwirklichungs-Code',
    cs2Desc: 'In welchem Bereich kannst du dich maximal entfalten?',
    cs3Title: 'Jahresprognose',
    cs3Desc: 'Welche Energien erwarten dich im kommenden Jahr?',
  },
  ru: {
    coverTitle: 'КОД КАРМИЧЕСКОГО УЗЛА',
    coverSubtitle: 'Кармическая нумерология — ваши кармические долги и пути их проработки',
    preparedFor: 'Подготовлено для',
    birthdate: 'Дата рождения',
    arcanaLabel: 'Аркан',
    createdOn: 'Создано',
    formulaLabel: 'Расчёт:',
    productName: 'Код кармического узла',

    introTitle: 'Ваши кармические узлы',
    introP1: (name: string, num: number) =>
      `Кармические узлы — это долги из прошлых жизней, которые вы принесли с собой в это воплощение. Они проявляются как повторяющиеся проблемы и внутренние блоки. Ваш кармический узел с арканом ${num} (${name}) показывает, какие уроки Вселенная приготовила для вас.`,
    introP2: 'Осознание этих паттернов — первый шаг к их проработке. Пока вы не осознаете свои кармические узлы, одни и те же ситуации будут повторяться.',
    introHighlight: 'Кармические узлы — это не наказание, а возможность для обучения. Каждый проработанный узел приближает вас к вашему истинному предназначению.',

    arcanaTitle: (num: number, name: string) => `${num} Аркан — ${name}`,
    arcanaIntro: (num: number, name: string, meaning: string) =>
      `Ваш кармический узел соответствует аркану ${name} (${num}). ${meaning}`,

    debtsTitle: 'Ваши кармические долги',
    debtsIntro: (name: string) =>
      `Следующие кармические долги связаны с энергией аркана ${name}. Они пришли из прошлых воплощений.`,

    charTitle: 'Черты характера из прошлых жизней',
    charIntro: (name: string) =>
      `Эти черты характера вы принесли из прошлых жизней. Они глубоко укоренены в вашем подсознании. Энергия аркана ${name} в минусе раскрывает эти теневые стороны.`,

    psychTitle: 'Психологические паттерны',
    psychIntro: (name: string) =>
      `Следующие психологические паттерны лежат глубоко в вашем подсознании и влияют на ваше поведение и отношения.`,
    psychImportant: 'Важно:',

    resolveTitle: 'Как проработать вашу карму',
    resolveIntro: 'Проработка кармы — это главное направление роста в этой жизни. Речь о том, чтобы осознанно работать над своими паттернами и шаг за шагом выходить в позитивное проявление.',
    resolveFollowup: 'Старые паттерны теряют власть над вами, и открываются новые возможности — в отношениях, в карьере и в духовном развитии.',
    healthLabel: 'Обратите внимание на здоровье:',

    crossSellTitle: 'Откройте полную картину',
    crossSellIntro: 'Код кармического узла — это лишь одна грань вашей кармической карты.',
    cs1Title: 'Код дня рождения',
    cs1Desc: 'Какие таланты и качества вы принесли из прошлых жизней?',
    cs2Title: 'Код самореализации',
    cs2Desc: 'В какой сфере вы можете реализоваться по максимуму?',
    cs3Title: 'Прогноз на год',
    cs3Desc: 'Какие энергии ждут вас в ближайшем году?',
  },
};

function p1Cover(result: KarmicKnotsResult, name: string, locale: Locale): string {
  const t = T[locale];
  const today = new Date().toLocaleDateString(getDateLocale(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `
    <div class="page cover">
      ${pageFrame()}

      <img class="cover-logo" src="${LOGO_FINAL}" alt="Numerologie PRO" />

      <div class="cover-title">${t.coverTitle}</div>
      <div class="cover-subtitle">
        ${t.coverSubtitle}
      </div>

      <div class="cover-divider">
        <div class="cover-divider-line"></div>
        <div class="cover-divider-dot"></div>
        <div class="cover-divider-line right"></div>
      </div>

      <div class="cover-label">${t.preparedFor}</div>
      <div class="cover-name">${name}</div>

      <div class="cover-label" style="margin-top: 24px;">${t.birthdate}</div>
      <div class="cover-birthdate">${result.birthdate}</div>

      <div class="cover-arcana-badge">
        <span>${t.arcanaLabel} ${result.arcanaNumber} — ${result.arcana.name}</span>
      </div>


      <div class="cover-footer">
        ${t.createdOn} ${today} &nbsp;·&nbsp; numerologie-pro.de
      </div>
    </div>
  `;
}

function generateCoverPage(
  result: KarmicKnotsResult,
  customerName: string,
  locale: Locale
): string {
  return p1Cover(result, customerName, locale);
}

// OLD FUNCTION - REMOVE AFTER MIGRATION
function OLD_generateCoverPage(
  result: KarmicKnotsResult,
  customerName: string,
  locale: Locale
): string {
  const t = T[locale];
  const today = new Date().toLocaleDateString(getDateLocale(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return coverPage({
    coverPhotoUri: COVER_PHOTO,
    title: t.coverTitle,
    subtitle: t.coverSubtitle,
    customerName: name,
    birthdate: result.birthdate,
    arcanaLabel: t.arcanaLabel,
    arcanaNumber: result.arcanaNumber,
    arcanaName: result.arcana.name,
    preparedForLabel: t.preparedFor,
    birthdateLabel: t.birthdate,
    createdOnLabel: t.createdOn,
    todayFormatted: today,
    extraHtml: formulaHtml,
  });
}

function p2Intro(result: KarmicKnotsResult, locale: Locale): string {
  const t = T[locale];
  return `
    <div class="page">
      ${pageFrame()}
      ${pageHeader(t.arcanaLabel, result.arcanaNumber, result.arcana.name)}
      <div class="content">
        <div class="section-title">${t.introTitle}</div>
        <div class="section-text">
          <p>${t.introP1(result.arcana.name, result.arcanaNumber)}</p>
          <p>${t.introP2}</p>
        </div>
        <div class="highlight-box"><p>${t.introHighlight}</p></div>
      </div>
      ${pageFooter(`${t.productName} — ${result.arcana.name}`, 2)}
    </div>
  `;
}

function p3ArcanaDesc(result: KarmicKnotsResult, locale: Locale): string {
  const t = T[locale];
  return `
    <div class="page">
      ${pageFrame()}
      ${pageHeader(t.arcanaLabel, result.arcanaNumber, result.arcana.name)}
      <div class="content">
        ${arcanaCardHtml(result.arcanaNumber, t.arcanaLabel)}
        <div class="section-title">${t.arcanaTitle(result.arcanaNumber, result.arcana.name)}</div>
        <div class="section-text">
          <p>${t.arcanaIntro(result.arcanaNumber, result.arcana.name, result.arcana.generalMeaning)}</p>
        </div>
      </div>
      ${pageFooter(`${t.productName} — ${result.arcana.name}`, 3)}
    </div>
  `;
}

function p4Debts(result: KarmicKnotsResult, locale: Locale): string {
  const t = T[locale];
  const items = splitTraits(result.arcana.karmicKnots).map(tr => `<li>${tr}</li>`).join('\n');
  return `
    <div class="page">
      ${pageFrame()}
      ${pageHeader(t.arcanaLabel, result.arcanaNumber, result.arcana.name)}
      <div class="content">
        <div class="section-title">${t.debtsTitle}</div>
        <div class="section-text"><p>${t.debtsIntro(result.arcana.name)}</p></div>
        <ul class="trait-list negative">${items}</ul>
      </div>
      ${pageFooter(`${t.productName} — ${result.arcana.name}`, 4)}
    </div>
  `;
}

function p5CharPatterns(result: KarmicKnotsResult, locale: Locale): string {
  const t = T[locale];
  const items = splitTraits(result.arcana.karmicCharacterTraits).map(tr => `<li>${tr}</li>`).join('\n');
  return `
    <div class="page">
      ${pageFrame()}
      ${pageHeader(t.arcanaLabel, result.arcanaNumber, result.arcana.name)}
      <div class="content">
        <div class="section-title">${t.charTitle}</div>
        <div class="section-text"><p>${t.charIntro(result.arcana.name)}</p></div>
        <ul class="trait-list negative">${items}</ul>
      </div>
      ${pageFooter(`${t.productName} — ${result.arcana.name}`, 5)}
    </div>
  `;
}

function p6Psychological(result: KarmicKnotsResult, locale: Locale): string {
  const t = T[locale];
  const negItems = splitTraits(result.arcana.negativeTraits).slice(0, 4).map(tr => `<li>${tr}</li>`).join('\n');
  return `
    <div class="page">
      ${pageFrame()}
      ${pageHeader(t.arcanaLabel, result.arcanaNumber, result.arcana.name)}
      <div class="content">
        <div class="section-title">${t.psychTitle}</div>
        <div class="section-text"><p>${t.psychIntro(result.arcana.name)}</p></div>
        <div class="section-text"><p>${result.arcana.psychologicalProblems}</p></div>
        ${negItems ? `
        <div class="highlight-box warning">
          <p><strong>${t.psychImportant}</strong></p>
        </div>
        <ul class="trait-list negative">${negItems}</ul>` : ''}
      </div>
      ${pageFooter(`${t.productName} — ${result.arcana.name}`, 6)}
    </div>
  `;
}

function p7Resolution(result: KarmicKnotsResult, locale: Locale): string {
  const t = T[locale];
  return `
    <div class="page">
      ${pageFrame()}
      ${pageHeader(t.arcanaLabel, result.arcanaNumber, result.arcana.name)}
      <div class="content">
        <div class="section-title">${t.resolveTitle}</div>
        <div class="section-text"><p>${t.resolveIntro}</p></div>
        <div class="section-text"><p>${result.arcana.karmicTask}</p></div>
        <div class="section-text"><p>${t.resolveFollowup}</p></div>
        ${result.arcana.health ? `
        <div class="section-text" style="margin-top: 16pt;">
          <p><strong>${t.healthLabel}</strong> ${result.arcana.health}</p>
        </div>` : ''}
      </div>
      ${pageFooter(`${t.productName} — ${result.arcana.name}`, 7)}
    </div>
  `;
}

function p8CrossSell(result: KarmicKnotsResult, locale: Locale): string {
  const t = T[locale];
  return `
    <div class="page">
      ${pageFrame()}
      ${pageHeader(t.arcanaLabel, result.arcanaNumber, result.arcana.name)}
      <div class="content">
        <div class="section-title">${t.crossSellTitle}</div>
        <div class="section-text"><p>${t.crossSellIntro}</p></div>
        <div class="cross-sell-item"><h4>${t.cs1Title}</h4><p>${t.cs1Desc}</p></div>
        <div class="cross-sell-item"><h4>${t.cs2Title}</h4><p>${t.cs2Desc}</p></div>
        <div class="cross-sell-item"><h4>${t.cs3Title}</h4><p>${t.cs3Desc}</p></div>
      </div>
      ${pageFooter(`${t.productName} — ${result.arcana.name}`, 8)}
    </div>
  `;
}

// ─── Main PDF Generator ───────────────────────────────────────────

export async function generateKarmicKnotsPDF(
  birthdate: string,
  customerName: string,
  locale: Locale = 'ru',
  execPath?: string
): Promise<Buffer> {
  const result = calculateKarmicKnotsCode(birthdate, locale);

  const pages = [
    p1Cover(result, customerName, locale),
    p2Intro(result, locale),
    p3ArcanaDesc(result, locale),
    p4Debts(result, locale),
    p5CharPatterns(result, locale),
    p6Psychological(result, locale),
    p7Resolution(result, locale),
    p8CrossSell(result, locale),
    generateThankYouPage(locale),
  ];

  return renderPdf(pages, locale, execPath);
}
