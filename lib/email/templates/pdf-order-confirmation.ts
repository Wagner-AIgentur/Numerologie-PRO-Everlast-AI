import { baseTemplate, goldButton, heading, paragraph, infoBox } from './base';

export function pdfOrderConfirmationEmail({
  name,
  productName,
  dashboardUrl,
  language = 'de',
}: {
  name: string;
  productName: string;
  dashboardUrl: string;
  language?: 'de' | 'ru';
}): { subject: string; html: string } {
  const isDE = language === 'de';

  const subject = isDE
    ? `Deine PDF-Analyse wird erstellt! — Swetlana`
    : `Твой PDF-анализ готовится! — Светлана`;

  const content = `
    ${heading(isDE ? `Danke für deine Bestellung, ${name}!` : `Спасибо за заказ, ${name}!`)}
    ${paragraph(isDE
      ? 'Ich habe deine Bestellung erhalten und erstelle jetzt deine persönliche PDF-Analyse. Ich melde mich bei dir über den gewählten Messenger, sobald alles fertig ist.'
      : 'Я получила твой заказ и сейчас готовлю твой персональный PDF-анализ. Я напишу тебе в выбранный мессенджер, как только всё будет готово.'
    )}
    ${infoBox(`
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-family:'Montserrat',Arial,sans-serif; font-size:12px; color:#8a8778; padding-bottom:4px; text-transform:uppercase; letter-spacing:1px;">${isDE ? 'Dein Paket' : 'Твой пакет'}</td>
        </tr>
        <tr>
          <td style="font-family:'Cormorant Garamond',Georgia,serif; font-size:20px; font-weight:600; color:#D4AF37; padding-bottom:16px;">${productName}</td>
        </tr>
        <tr>
          <td style="font-family:'Montserrat',Arial,sans-serif; font-size:12px; color:#8a8778; padding-bottom:4px; text-transform:uppercase; letter-spacing:1px;">${isDE ? 'Status' : 'Статус'}</td>
        </tr>
        <tr>
          <td style="font-family:'Montserrat',Arial,sans-serif; font-size:14px; color:#e8e4d9;">⏳ ${isDE ? 'Wird erstellt (innerhalb 24h)' : 'Готовится (в течение 24ч)'}</td>
        </tr>
      </table>
    `)}
    ${paragraph(isDE
      ? 'Sobald deine Analyse fertig ist, findest du sie auch in deinem persönlichen Dashboard.'
      : 'Как только анализ будет готов, ты также найдёшь его в своём личном кабинете.'
    )}
    ${goldButton(
      isDE ? 'Zum Dashboard' : 'Открыть кабинет',
      dashboardUrl
    )}
    ${paragraph(`<span style="font-size:13px; color:#7a776d;">${isDE
      ? 'Bei Fragen schreib mir — ich bin für dich da! 💫 Alles Liebe, Swetlana'
      : 'По вопросам пиши мне — я на связи! 💫 С любовью, Светлана'
    }</span>`)}
  `;

  return {
    subject,
    html: baseTemplate({
      title: subject,
      preheader: isDE
        ? `Deine ${productName} wird erstellt!`
        : `Твой ${productName} готовится!`,
      content,
    }),
  };
}
