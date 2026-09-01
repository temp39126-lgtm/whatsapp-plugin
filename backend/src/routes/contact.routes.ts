import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { avatarUploadMiddleware } from '../middleware/upload';
import * as controller from '../controllers/contact.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listContacts);
router.get('/:id/avatar', controller.getContactAvatar);
router.post('/:id/avatar', avatarUploadMiddleware.single('avatar'), controller.uploadContactAvatar);
router.get('/:id', controller.getContact);
router.put('/:id', controller.updateContact);
router.put('/:id/assign', requireRole('ADMIN'), controller.assignContact);
router.delete('/:id', controller.deleteContact);

export default router;
