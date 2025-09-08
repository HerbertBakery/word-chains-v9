export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export function normalizeUsername(raw: string) {
  return (raw || "").trim().toLowerCase();
}

type ValidationOK = { ok: true };
type ValidationErr = { ok: false; reason: string };
export type ValidationResult = ValidationOK | ValidationErr;

/**
 * Friendly rule:
 * - 3–20 chars
 * - a–z, 0–9, dot ".", underscore "_"
 * - no leading/trailing "." or "_"
 * - no consecutive "." or "_"
 */
export function validateUsername(raw: string): ValidationResult {
  const s = normalizeUsername(raw);

  if (s.length < USERNAME_MIN || s.length > USERNAME_MAX) {
    return { ok: false, reason: `Use ${USERNAME_MIN}–${USERNAME_MAX} characters.` };
  }
  if (!/^[a-z0-9._]+$/.test(s)) {
    return { ok: false, reason: "Only a–z, 0–9, dot (.) and underscore (_)." };
  }
  if (/^[._]/.test(s) || /[._]$/.test(s)) {
    return { ok: false, reason: "Can't start or end with \".\" or \"_\"." };
  }
  if (/[._]{2,}/.test(s)) {
    return { ok: false, reason: "No consecutive dots/underscores." };
  }

  return { ok: true };
}
