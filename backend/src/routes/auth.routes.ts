import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '../validators/auth.validator';
import * as controller from '../controllers/auth.controller';

const router = Router();

router.post('/login', validateBody(loginSchema), controller.login);
router.get('/me', authenticate, tenantAccess, controller.getCurrentUser);
router.post('/logout', authenticate, controller.logout);

export default router;
