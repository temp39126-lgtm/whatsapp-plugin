import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import * as controller from '../controllers/notification.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listNotifications);
router.post('/read-all', controller.markAllNotificationsRead);
router.patch('/:id/read', controller.markNotificationRead);

export default router;
