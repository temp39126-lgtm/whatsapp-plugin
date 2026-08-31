import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import * as controller from '../controllers/contact.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listContacts);
router.get('/:id', controller.getContact);
router.put('/:id', controller.updateContact);
router.put('/:id/assign', requireRole('ADMIN'), controller.assignContact);

export default router;
