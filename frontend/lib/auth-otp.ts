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
