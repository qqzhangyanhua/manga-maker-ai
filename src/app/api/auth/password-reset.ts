import { createHash, timingSafeEqual } from "crypto";

export const PASSWORD_RESET_TTL_SECONDS = 600;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

export function normalizePasswordResetEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function passwordResetCodeKey(email: string): string {
  return `password-reset:${email}`;
}

export function passwordResetAttemptsKey(email: string): string {
  return `password-reset-attempts:${email}`;
}

export function passwordResetVoidedKey(email: string): string {
  return `password-reset-voided:${email}`;
}

/** 先哈希再比较，避免验证码长度不同时提前返回。 */
export function passwordResetCodesMatch(stored: string, provided: string): boolean {
  const left = createHash("sha256").update(stored).digest();
  const right = createHash("sha256").update(provided).digest();
  return timingSafeEqual(left, right);
}
