import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(6).max(128),
});

export const verifyOtpSchema = z.object({
  challengeId: z.string().uuid(),
  code: z
    .string()
    .transform((value) => value.replace(/\D/g, '').slice(0, 6))
    .pipe(z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code')),
});

export const resendOtpSchema = z.object({
  challengeId: z.string().uuid(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6).max(128),
});

export const changeEmailSchema = z.object({
  email: z.string().email(),
  currentPassword: z.string().min(1, 'Password is required to change email'),
});

export const createTeamUserSchema = signupSchema;
