import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { requirePermission } from '../middleware/requirePermission';
import { validateBody } from '../middleware/validate';
import { whatsAppAccountSchema, updateProfileSchema, updatePreferencesSchema } from '../validators/message.validator';
import { avatarUploadMiddleware } from '../middleware/upload';
import * as controller from '../controllers/settings.controller';
import * as profileController from '../controllers/profile.controller';

const router = Router();

router.get('/me', authenticate, tenantAccess, controller.getCurrentUser);

router.use(authenticate, tenantAccess);

router.get('/profile', profileController.getProfile);
router.put('/profile', validateBody(updateProfileSchema), profileController.updateProfile);
router.put(
  '/profile/preferences',
  validateBody(updatePreferencesSchema),
  profileController.updatePreferences
);
router.get('/profile/avatar', profileController.getProfileAvatar);
router.post(
  '/profile/avatar',
  avatarUploadMiddleware.single('avatar'),
  profileController.uploadProfileAvatar
);
router.get('/settings/connection', controller.getConnectionStatus);
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
