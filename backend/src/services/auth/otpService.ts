import crypto from 'crypto';
import { AuthOtpChallenge, IAuthOtpChallenge, IOtpPayload, OtpPurpose } from '../../models/AuthOtpChallenge';
import { env } from '../../config/env';
import { AppError } from '../../types';
import { sendOtpEmail } from '../email/emailService';
import { logger } from '../../config/logger';

const MAX_OTP_ATTEMPTS = 5;
const OTP_LENGTH = 6;

function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateOtpCode(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export function buildOtpChallengeResponse(challengeId: string, email: string) {
  return {
    requiresOtp: true as const,
    challengeId,
    maskedEmail: maskEmail(email),
    message: `We sent a ${OTP_LENGTH}-digit verification code to your email.`,
  };
}

export async function createOtpChallenge(params: {
  email: string;
  tenantId: string;
  purpose: OtpPurpose;
  payload?: IOtpPayload;
}): Promise<{ challengeId: string; code: string }> {
  const normalizedEmail = params.email.toLowerCase().trim();
  const code = generateOtpCode();
  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

  await AuthOtpChallenge.deleteMany({
    email: normalizedEmail,
    purpose: params.purpose,
  });

  await AuthOtpChallenge.create({
    challengeId,
    email: normalizedEmail,
    tenantId: params.tenantId,
    purpose: params.purpose,
    codeHash: hashOtpCode(code),
    expiresAt,
    attempts: 0,
    payload: params.payload ?? {},
  });

  return { challengeId, code };
}

export async function sendOtpChallengeEmail(params: {
  tenantId: string;
  email: string;
  purpose: OtpPurpose;
  code: string;
  name?: string;
}): Promise<boolean> {
  const purposeLabel =
    params.purpose === 'login'
      ? 'sign in'
      : params.purpose === 'signup'
        ? 'complete your sign up'
        : 'reset your password';

  const sent = await sendOtpEmail({
    tenantId: params.tenantId,
    to: params.email,
    name: params.name,
    code: params.code,
    purposeLabel,
    expiresMinutes: env.OTP_EXPIRES_MINUTES,
  });

  if (!sent) {
    logger.warn(
      { email: params.email, purpose: params.purpose },
      'OTP email delivery failed'
    );
  }

  return sent;
}

export async function verifyOtpChallenge(
  challengeId: string,
  code: string
): Promise<IAuthOtpChallenge> {
  const challenge = await AuthOtpChallenge.findOne({ challengeId }).select('+codeHash +payload.passwordHash');
  if (!challenge) {
    throw new AppError(400, 'Invalid or expired verification code');
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    await AuthOtpChallenge.deleteOne({ _id: challenge._id });
    throw new AppError(400, 'Verification code has expired. Request a new one.');
  }

  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    await AuthOtpChallenge.deleteOne({ _id: challenge._id });
    throw new AppError(429, 'Too many failed attempts. Request a new verification code.');
  }

  const candidateHash = hashOtpCode(code.trim());
  const isValid =
    candidateHash.length === challenge.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(challenge.codeHash));
  if (!isValid) {
    challenge.attempts += 1;
    await challenge.save();
    throw new AppError(400, 'Invalid verification code');
  }

  await AuthOtpChallenge.deleteOne({ _id: challenge._id });
  return challenge;
}

export async function resendOtpChallenge(challengeId: string): Promise<{ challengeId: string; code: string }> {
  const existing = await AuthOtpChallenge.findOne({ challengeId }).select('+payload.passwordHash');
  if (!existing || existing.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'Verification session expired. Start again.');
  }

  const code = generateOtpCode();
  existing.codeHash = hashOtpCode(code);
  existing.expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
  await existing.save();

  return { challengeId: existing.challengeId, code };
}

export { OTP_LENGTH };
