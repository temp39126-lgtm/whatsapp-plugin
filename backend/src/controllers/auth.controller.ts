import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { loginWithPassword, registerUser, requestPasswordReset, resetPasswordWithToken } from '../services/auth/authService';
import { getUserProfile } from '../services/users/userProfileService';

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
    res.status(201).json(result);
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
