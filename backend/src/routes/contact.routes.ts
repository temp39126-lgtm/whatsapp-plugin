import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { createContactSchema } from '../validators/contact.validator';
import { avatarUploadMiddleware } from '../middleware/upload';
import * as controller from '../controllers/contact.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listContacts);
router.post('/', validateBody(createContactSchema), controller.createContact);
router.get('/:id/avatar', controller.getContactAvatar);
router.post('/:id/avatar', requireRole('ADMIN'), avatarUploadMiddleware.single('avatar'), controller.uploadContactAvatar);
router.post('/:id/open-conversation', controller.openContactConversation);
router.get('/:id', controller.getContact);
router.put('/:id', controller.updateContact);
router.put('/:id/assign', requireRole('ADMIN'), controller.assignContact);
router.delete('/:id', controller.deleteContact);

export default router;
