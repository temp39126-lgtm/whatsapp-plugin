import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { requirePermission } from '../middleware/requirePermission';
import { validateBody } from '../middleware/validate';
import { whatsAppAccountSchema } from '../validators/message.validator';
import * as controller from '../controllers/settings.controller';

const router = Router();

router.get('/me', authenticate, tenantAccess, controller.getCurrentUser);

router.use(authenticate, tenantAccess);

router.get('/settings/account', requireRole('ADMIN'), requirePermission('manage_settings'), controller.getAccountSettings);
router.put(
  '/settings/account',
  requireRole('ADMIN'),
  requirePermission('manage_settings'),
  validateBody(whatsAppAccountSchema),
  controller.updateAccountSettings
);
router.get('/settings/webhook', requireRole('ADMIN'), controller.getWebhookInfo);
router.get('/team/workload', requireRole('ADMIN'), requirePermission('manage_team'), controller.getTeamWorkload);
router.get('/team/users', requireRole('ADMIN'), requirePermission('manage_team'), controller.listTeamUsers);

export default router;
