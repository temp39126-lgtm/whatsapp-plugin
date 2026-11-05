import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import {
  createAdminTemplateSchema,
  updateAdminTemplateSchema,
} from '../validators/template.admin.validator';
import * as controller from '../controllers/adminTemplate.controller';

const router = Router();

router.use(authenticate, tenantAccess, requireRole('ADMIN'));

router.get('/', controller.listTemplates);
router.post('/', validateBody(createAdminTemplateSchema), controller.createTemplate);
router.put('/:id', validateBody(updateAdminTemplateSchema), controller.updateTemplate);
router.delete('/:id', controller.deleteTemplate);

export default router;
