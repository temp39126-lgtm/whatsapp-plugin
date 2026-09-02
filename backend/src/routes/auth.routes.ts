import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { validateBody } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';
import * as controller from '../controllers/auth.controller';

const router = Router();

router.post('/login', authRateLimiter, validateBody(loginSchema), controller.login);
router.post('/signup', authRateLimiter, validateBody(signupSchema), controller.signup);
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), controller.resetPassword);
router.get('/me', authenticate, tenantAccess, controller.getCurrentUser);
router.post('/logout', authenticate, controller.logout);

export default router;
