import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { createCommunitySchema } from '../validators/group.validator';
import * as controller from '../controllers/community.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listCommunities);
router.post('/', requireRole('ADMIN'), validateBody(createCommunitySchema), controller.createCommunity);

export default router;
