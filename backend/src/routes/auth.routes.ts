import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { validateBody } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  otpChallengeStatusSchema,
} from '../validators/auth.validator';
import { validateQuery } from '../middleware/validate';
import * as controller from '../controllers/auth.controller';

const router = Router();

router.post('/login', authRateLimiter, validateBody(loginSchema), controller.login);
router.post('/signup', authRateLimiter, validateBody(signupSchema), controller.signup);
router.post('/verify-otp', authRateLimiter, validateBody(verifyOtpSchema), controller.verifyOtp);
router.post('/resend-otp', authRateLimiter, validateBody(resendOtpSchema), controller.resendOtp);
router.get(
  '/otp-challenge-status',
  authRateLimiter,
  validateQuery(otpChallengeStatusSchema),
  controller.otpChallengeStatus
);
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), controller.resetPassword);
router.get('/me', authenticate, tenantAccess, controller.getCurrentUser);
router.post('/establish-session', authRateLimiter, authenticate, controller.establishSession);
router.post('/logout', authenticate, controller.logout);

export default router;
