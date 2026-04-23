// ============================================================================
// Review-request email template — fr-CA
// ============================================================================
// Returns { subject, html, text } for the transactional review-request email.
// Rendered from clinic + patient data + a magic link. The email appears to
// come FROM the clinic (sender_name), not Épidou — Épidou is plumbing.
//
// CASL footer includes clinic name, physical address, and an unsubscribe
// mechanism. Callers also attach List-Unsubscribe headers at the transport
// layer (see lib/senders/email.ts).
// ============================================================================

export type ReviewRequestTemplateInput = {
  clinicName: string;
  clinicAddress: string; // One-line: "123 Rue St-Denis, Montréal, QC H2X 3K8"
  patientFirstName: string; // "Marie" — falls back to "bonjour" when empty
  magicLinkUrl: string; // https://app.epidou.com/r/{token}
  unsubscribeUrl: string; // mailto: or https:// — rendered in footer
};

export type ReviewRequestTemplateOutput = {
  subject: string;
  html: string;
  text: string;
};

export function renderReviewRequestEmail(
  input: ReviewRequestTemplateInput,
): ReviewRequestTemplateOutput {
  const { clinicName, clinicAddress, patientFirstName, magicLinkUrl, unsubscribeUrl } = input;

  const greeting = patientFirstName?.trim()
    ? `Bonjour ${escapeHtml(patientFirstName.trim())},`
    : 'Bonjour,';

  const subject = `${clinicName} — votre expérience compte`;

  const html = `<!DOCTYPE html>
<html lang="fr-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f5f3;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,0.04);max-width:560px;">
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#6b6b6b;">${escapeHtml(clinicName)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#1a1a1a;">${greeting}</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1a1a1a;">
                Merci d'avoir choisi <strong>${escapeHtml(clinicName)}</strong>. Nous espérons que vous avez vécu une belle expérience.
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#1a1a1a;">
                Pourriez-vous prendre 30 secondes pour nous partager comment s'est passée votre visite ? Votre avis nous aide à nous améliorer et à aider d'autres patients à nous trouver.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 32px 32px;">
              <a href="${escapeAttr(magicLinkUrl)}"
                 style="display:inline-block;padding:14px 28px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.01em;">
                Partager mon expérience
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <p style="margin:0;font-size:14px;line-height:1.5;color:#6b6b6b;">
                Avec gratitude,<br>
                L'équipe ${escapeHtml(clinicName)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #eeece8;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                <strong>${escapeHtml(clinicName)}</strong><br>
                ${escapeHtml(clinicAddress)}
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8a8a;">
                Vous recevez ce message parce que vous avez pris rendez-vous à ${escapeHtml(clinicName)}.
                <a href="${escapeAttr(unsubscribeUrl)}" style="color:#6b6b6b;text-decoration:underline;">Se désabonner</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `${clinicName} — votre expérience compte`,
    '',
    greeting.replace(/<[^>]+>/g, ''),
    '',
    `Merci d'avoir choisi ${clinicName}. Nous espérons que vous avez vécu une belle expérience.`,
    '',
    `Pourriez-vous prendre 30 secondes pour nous partager comment s'est passée votre visite ? Votre avis nous aide à nous améliorer et à aider d'autres patients à nous trouver.`,
    '',
    `Partager mon expérience : ${magicLinkUrl}`,
    '',
    `Avec gratitude,`,
    `L'équipe ${clinicName}`,
    '',
    '---',
    clinicName,
    clinicAddress,
    '',
    `Vous recevez ce message parce que vous avez pris rendez-vous à ${clinicName}.`,
    `Se désabonner : ${unsubscribeUrl}`,
  ].join('\n');

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
