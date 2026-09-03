import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { avatarUploadMiddleware } from '../middleware/upload';
import { createGroupSchema } from '../validators/group.validator';
import * as controller from '../controllers/group.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listGroups);
router.post('/', requireRole('ADMIN'), validateBody(createGroupSchema), controller.createGroup);
router.get('/:id/avatar', controller.getGroupAvatar);
router.post('/:id/avatar', requireRole('ADMIN'), avatarUploadMiddleware.single('avatar'), controller.uploadGroupAvatar);
router.get('/:id', controller.getGroup);
router.delete('/:id', requireRole('ADMIN'), controller.deleteGroup);

export default router;
