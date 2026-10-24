import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantAccess } from '../middleware/tenantAccess';
import { callAccess } from '../middleware/callAccess';
import { validateBody } from '../middleware/validate';
import { acceptCallSchema, startCallSchema } from '../validators/message.validator';
import * as controller from '../controllers/call.controller';

const router = Router();

router.use(authenticate, tenantAccess);

router.get('/', controller.listCalls);
router.delete('/history', controller.clearCallHistory);
router.get('/incoming/active', controller.listActiveIncomingCalls);
router.get('/:id', callAccess, controller.getCall);
router.delete('/:id', callAccess, controller.deleteCallFromHistory);
router.post('/start', validateBody(startCallSchema), controller.startCall);
router.post('/:id/accept', callAccess, validateBody(acceptCallSchema), controller.acceptCall);
router.post('/:id/reject', callAccess, controller.rejectCall);
router.post('/:id/end', callAccess, controller.endCall);

export default router;
