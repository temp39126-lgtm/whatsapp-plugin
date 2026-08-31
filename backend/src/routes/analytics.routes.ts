import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { requirePermission } from '../middleware/requirePermission';
import * as controller from '../controllers/settings.controller';

const router = Router();

router.use(authenticate, tenantAccess, requireRole('ADMIN'), requirePermission('view_analytics'));

router.get('/conversations', controller.getConversationAnalytics);
router.get('/messages', controller.getMessageAnalytics);
router.get('/agents', controller.getAgentAnalytics);
router.get('/calls', controller.getCallAnalytics);

export default router;
