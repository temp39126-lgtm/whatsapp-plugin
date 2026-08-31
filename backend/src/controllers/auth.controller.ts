import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { loginWithPassword, registerUser } from '../services/auth/authService';

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

export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  res.json(req.user);
}

export async function logout(_req: AuthenticatedRequest, res: Response) {
  res.status(204).send();
}
