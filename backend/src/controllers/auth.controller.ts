import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import {
  loginWithPassword,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
  completeLoginAfterOtp,
  completeSignupAfterOtp,
  issuePasswordResetTokenAfterOtp,
} from '../services/auth/authService';
import { getUserProfile } from '../services/users/userProfileService';
import { resendOtpChallenge, sendOtpChallengeEmail, verifyOtpChallenge } from '../services/auth/otpService';
import { AuthOtpChallenge } from '../models/AuthOtpChallenge';

export async function login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await loginWithPassword(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function signup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };
    const result = await registerUser(name, email, password);
    if ('requiresOtp' in result) {
      res.status(200).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { challengeId, code } = req.body as { challengeId: string; code: string };
    const challenge = await verifyOtpChallenge(challengeId, code);

    if (challenge.purpose === 'login') {
      const result = await completeLoginAfterOtp(challenge);
      res.json(result);
      return;
    }

    if (challenge.purpose === 'signup') {
      const result = await completeSignupAfterOtp(challenge);
      res.status(201).json(result);
      return;
    }

    const result = await issuePasswordResetTokenAfterOtp(challenge);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resendOtp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { challengeId } = req.body as { challengeId: string };
    const { challengeId: nextChallengeId, code } = await resendOtpChallenge(challengeId);
    const challenge = await AuthOtpChallenge.findOne({ challengeId: nextChallengeId });
    if (!challenge) {
      res.status(400).json({ error: 'Verification session expired. Start again.' });
      return;
    }

    const emailSent = await sendOtpChallengeEmail({
      tenantId: challenge.tenantId,
      email: challenge.email,
      purpose: challenge.purpose,
      code,
    });

    res.json({
      challengeId: nextChallengeId,
      message: 'A new verification code has been sent to your email.',
      ...(!emailSent ? { devOtpCode: code } : {}),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getUserProfile(req.user!);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: AuthenticatedRequest, res: Response) {
  res.status(204).send();
}

export async function forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { email } = req.body as { email: string };
    const result = await requestPasswordReset(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body as { token: string; password: string };
    const result = await resetPasswordWithToken(token, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
