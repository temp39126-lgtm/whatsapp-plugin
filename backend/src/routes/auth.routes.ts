import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { validateBody } from '../middleware/validate';
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';
import * as controller from '../controllers/auth.controller';

const router = Router();

router.post('/login', validateBody(loginSchema), controller.login);
router.post('/signup', validateBody(signupSchema), controller.signup);
router.post('/forgot-password', validateBody(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), controller.resetPassword);
router.get('/me', authenticate, tenantAccess, controller.getCurrentUser);
router.post('/logout', authenticate, controller.logout);

export default router;
