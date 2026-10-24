import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { requirePermission } from '../middleware/requirePermission';
import { validateBody } from '../middleware/validate';
import { adminEmailRateLimiter } from '../middleware/rateLimiter';
import { whatsAppAccountSchema, updateProfileSchema, updatePreferencesSchema } from '../validators/message.validator';
import {
  updateWhatsAppAccountSchema,
  updateTenantNotificationSettingsSchema,
  testNotificationEmailSchema,
  testWhatsAppConnectionSchema,
} from '../validators/settings.validator';
import {
  createTeamUserSchema,
  changePasswordSchema,
  changeEmailSchema,
  updateTeamUserPermissionsSchema,
} from '../validators/auth.validator';
import { requireAnyPermission } from '../middleware/requireAnyPermission';
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
router.put(
  '/profile/password',
  validateBody(changePasswordSchema),
  profileController.changePassword
);
router.put('/profile/email', validateBody(changeEmailSchema), profileController.changeEmail);
router.get('/settings/connection', controller.getConnectionStatus);
router.get('/settings/account', requirePermission('manage_settings'), controller.getAccountSettings);
router.put(
  '/settings/account',
  requirePermission('manage_settings'),
  validateBody(updateWhatsAppAccountSchema),
  controller.updateAccountSettings
);
router.post(
  '/settings/account/test-connection',
  requirePermission('manage_settings'),
  validateBody(testWhatsAppConnectionSchema),
  controller.testAccountConnection
);
router.get(
  '/settings/notifications',
  requirePermission('manage_settings'),
  controller.getNotificationSettings
);
router.put(
  '/settings/notifications',
  requirePermission('manage_settings'),
  validateBody(updateTenantNotificationSettingsSchema),
  controller.updateNotificationSettings
);
router.post(
  '/settings/notifications/test',
  requirePermission('manage_settings'),
  adminEmailRateLimiter,
  validateBody(testNotificationEmailSchema),
  controller.sendNotificationTestEmail
);
router.get('/settings/webhook', requirePermission('manage_settings'), controller.getWebhookInfo);
router.get('/team/workload', requirePermission('manage_team'), controller.getTeamWorkload);
router.get(
  '/team/users',
  requireAnyPermission('manage_team', 'assign_conversations'),
  controller.listTeamUsers
);
router.get(
  '/team/users/:id/avatar',
  requireAnyPermission('manage_team', 'assign_conversations'),
  controller.getTeamUserAvatar
);
router.post(
  '/team/users',
  requirePermission('manage_team'),
  validateBody(createTeamUserSchema),
  controller.createTeamUserAccount
);
router.put(
  '/team/users/:id/permissions',
  requirePermission('manage_team'),
  validateBody(updateTeamUserPermissionsSchema),
  controller.updateTeamUserPermissionsAccount
);
router.delete(
  '/team/users/:id',
  requirePermission('manage_team'),
  controller.deleteTeamUserAccount
);

export default router;
