import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { validateBody } from '../middleware/validate';
import { createGroupSchema } from '../validators/group.validator';
import * as controller from '../controllers/group.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listGroups);
router.post('/', validateBody(createGroupSchema), controller.createGroup);

export default router;
