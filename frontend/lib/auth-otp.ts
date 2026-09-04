import type { AuthUser } from '@/types';

export interface AuthOtpChallengeResponse {
  requiresOtp: true;
  challengeId: string;
  maskedEmail: string;
  message: string;
  emailDeliveryFailed?: boolean;
  emailSent?: boolean;
}

export interface AuthSuccessResponse {
  user: AuthUser;
}

export interface PasswordResetOtpResponse {
  resetToken: string;
  message: string;
}

export type OtpPurpose = 'login' | 'signup' | 'password_reset';

const OTP_SESSION_KEY = 'whatsapp_crm_otp_challenge';
const OTP_SESSION_MAX_AGE_MS = 30 * 60 * 1000;

interface StoredOtpChallenge extends AuthOtpChallengeResponse {
  purpose: OtpPurpose;
  savedAt: number;
}

export function isOtpChallengeResponse(
  value: unknown
): value is AuthOtpChallengeResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'requiresOtp' in value &&
    (value as AuthOtpChallengeResponse).requiresOtp === true
  );
}

export function saveOtpChallenge(challenge: AuthOtpChallengeResponse, purpose: OtpPurpose): void {
  if (typeof window === 'undefined') return;
  const payload: StoredOtpChallenge = {
    ...challenge,
    purpose,
    savedAt: Date.now(),
  };
  sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify(payload));
}

export function loadOtpChallenge(
  purpose?: OtpPurpose
): (AuthOtpChallengeResponse & { purpose: OtpPurpose }) | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(OTP_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredOtpChallenge;
    if (!parsed.challengeId || !parsed.maskedEmail) return null;
    if (purpose && parsed.purpose !== purpose) return null;
    if (Date.now() - parsed.savedAt > OTP_SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(OTP_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(OTP_SESSION_KEY);
    return null;
  }
}

export function clearOtpChallenge(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(OTP_SESSION_KEY);
}
