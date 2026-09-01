import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { requirePermission } from '../middleware/requirePermission';
import { validateBody } from '../middleware/validate';
import { createTagSchema } from '../validators/message.validator';
import * as controller from '../controllers/settings.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listTags);
router.post('/', validateBody(createTagSchema), controller.createTag);
router.put('/:id', requireRole('ADMIN'), controller.updateTag);
router.delete('/:id', controller.deleteTag);

export default router;
