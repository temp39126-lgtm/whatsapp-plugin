import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { conversationAccess } from '../middleware/conversationAccess';
import { validateBody } from '../middleware/validate';
import { createMessageSchema, reactionSchema } from '../validators/message.validator';
import * as conversationController from '../controllers/conversation.controller';
import * as messageController from '../controllers/message.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/conversations/:id/messages', conversationAccess(), messageController.listMessages);
router.post(
  '/conversations/:id/messages',
  conversationAccess(),
  validateBody(createMessageSchema),
  messageController.createMessage
);
router.get('/conversations/:id/pinned', conversationAccess(), messageController.getPinned);
router.get('/conversations/:id/starred', conversationAccess(), messageController.getStarred);

router.post(
  '/messages/:id/reactions',
  validateBody(reactionSchema),
  messageController.addReaction
);
router.post('/messages/:id/pin', messageController.togglePin);
router.post('/messages/:id/star', messageController.toggleStar);
router.post('/messages/:id/retry', messageController.retryMessage);

export default router;
