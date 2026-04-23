// ============================================================================
// Review-request SMS template — fr-CA
// ============================================================================
// Hard budget: 160 chars (1 segment) for best deliverability and lowest cost.
// Longer messages get split into multiple segments by the carrier and billed
// separately. We pre-truncate the magic link slug if necessary to keep the
// body inside one segment.
//
// CASL content: sender (clinicName), call-to-action, STOP keyword. Physical
// address lives on the TFV-registered sender profile, which is what Canadian
// carriers check — not required inline for approved toll-free flows.
// ============================================================================

export type ReviewRequestSmsInput = {
  clinicName: string;
  patientFirstName: string;
  magicLinkUrl: string;
};

export type ReviewRequestSmsOutput = {
  body: string;
  /** True when we had to trim or omit content to fit the 160-char budget */
  truncated: boolean;
};

const SMS_HARD_LIMIT = 160;

export function renderReviewRequestSms(
  input: ReviewRequestSmsInput,
): ReviewRequestSmsOutput {
  const clinicName = input.clinicName.trim();
  const first = input.patientFirstName?.trim() ?? '';
  const link = input.magicLinkUrl.trim();

  // Preferred form: full greeting + first name
  const full = first
    ? `${clinicName}: Bonjour ${first}, comment s'est passée votre visite? ${link} STOP pour vous désabonner.`
    : `${clinicName}: Comment s'est passée votre visite? Partagez votre expérience: ${link} STOP pour vous désabonner.`;

  if (full.length <= SMS_HARD_LIMIT) {
    return { body: full, truncated: false };
  }

  // Shorter fallback — drop the first name
  const short = `${clinicName}: Partagez votre expérience: ${link} STOP pour annuler.`;
  if (short.length <= SMS_HARD_LIMIT) {
    return { body: short, truncated: true };
  }

  // Clinic name is long enough to bust 160 with link — hard-truncate clinic name
  const linkAndTail = ` ${link} STOP pour annuler.`;
  const budget = SMS_HARD_LIMIT - linkAndTail.length - 3; // 3 = "...:"
  const trimmedName = clinicName.slice(0, Math.max(8, budget));
  return {
    body: `${trimmedName}...:${linkAndTail}`,
    truncated: true,
  };
}
