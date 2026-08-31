import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { requireRole } from '../middleware/requireRole';
import { requirePermission } from '../middleware/requirePermission';
import { conversationAccess } from '../middleware/conversationAccess';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  assignConversationSchema,
  updateStatusSchema,
  updatePrioritySchema,
  updateTagsSchema,
  createNoteSchema,
  conversationQuerySchema,
} from '../validators/conversation.validator';
import * as controller from '../controllers/conversation.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', validateQuery(conversationQuerySchema), controller.listConversations);
router.get('/:id', conversationAccess(), controller.getConversation);
router.post(
  '/:id/assign',
  requireRole('ADMIN'),
  requirePermission('assign_conversations'),
  conversationAccess(),
  validateBody(assignConversationSchema),
  controller.assignConversation
);
router.put(
  '/:id/status',
  conversationAccess(),
  validateBody(updateStatusSchema),
  controller.updateStatus
);
router.put(
  '/:id/priority',
  conversationAccess(),
  validateBody(updatePrioritySchema),
  controller.updatePriority
);
router.put(
  '/:id/tags',
  conversationAccess(),
  validateBody(updateTagsSchema),
  controller.updateTags
);
router.post(
  '/:id/notes',
  conversationAccess(),
  validateBody(createNoteSchema),
  controller.createNote
);
router.get('/:id/notes', conversationAccess(), controller.listNotes);
router.get('/:id/activity', conversationAccess(), controller.getActivity);
router.post('/:id/read', conversationAccess(), controller.markRead);

export default router;
