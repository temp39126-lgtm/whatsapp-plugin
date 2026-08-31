import { AuthUser } from '../../types';
import { Call, ICall } from '../../models/Call';
import { CallEvent } from '../../models/CallEvent';
import { Conversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';
import { buildConversationFilter } from '../rbac/conversationAccess';
import { emitToAuthorizedUsers } from '../realtime/socketService';
import { env } from '../../config/env';
import { AppError } from '../../types';
import { getPagination, paginatedResponse } from '../../utils/pagination';

export async function listCalls(user: AuthUser, page = 1, limit = 20) {
  const { skip, limit: lim } = getPagination({ page, limit });

  let query: Record<string, unknown> = { tenantId: user.tenantId };

  if (user.role !== 'ADMIN') {
    const accessibleConversations = await Conversation.find(
      buildConversationFilter(user)
    ).select('_id');
    query.conversationId = { $in: accessibleConversations.map((c) => c._id) };
  }

  const calls = await Call.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(lim)
    .populate('contactId', 'name phone')
    .lean();

  const total = await Call.countDocuments(query);
  return paginatedResponse(calls, total, page, lim);
}

export async function getCall(user: AuthUser, callId: string) {
  const call = await Call.findOne({ _id: callId, tenantId: user.tenantId })
    .populate('contactId')
    .populate('conversationId');
  if (!call) throw new AppError(404, 'Call not found');

  const events = await CallEvent.find({ callId: call._id }).sort({ createdAt: 1 });
  return { call, events };
}

async function createCallEvent(call: ICall, eventType: string, metadata?: Record<string, unknown>) {
  await CallEvent.create({
    tenantId: call.tenantId,
    callId: call._id,
    eventType,
    metadata,
  });
}

export async function startCall(user: AuthUser, conversationId: string) {
  if (!env.CALLING_ENABLED) {
    throw new AppError(503, 'WhatsApp calling is not enabled for this account');
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    tenantId: user.tenantId,
  });
  if (!conversation) throw new AppError(404, 'Conversation not found');

  const [account, contact] = await Promise.all([
    WhatsAppAccount.findById(conversation.whatsappAccountId),
    Contact.findById(conversation.contactId),
  ]);
  if (!account || !contact) throw new AppError(404, 'Account or contact not found');

  const call = await Call.create({
    tenantId: user.tenantId,
    whatsappAccountId: account._id,
    conversationId: conversation._id,
    contactId: contact._id,
    initiatedByUserId: user.userId,
    direction: 'OUTGOING',
    status: 'INITIATING',
    startedAt: new Date(),
  });

  await createCallEvent(call, 'call.initiating');

  try {
    const { initiateCall } = await import('../whatsapp/metaApi');
    const result = await initiateCall(account.phoneNumberId, contact.whatsappId, account);
    call.metaCallId = result.call_id;
    call.status = 'RINGING';
    await call.save();
    await createCallEvent(call, 'call.ringing');
  } catch {
    call.status = 'FAILED';
    call.failureReason = 'Meta calling API not available';
    await call.save();
    await createCallEvent(call, 'call.failed', { reason: call.failureReason });
  }

  await emitToAuthorizedUsers(user.tenantId, conversationId, 'call.ringing', {
    call: call.toObject(),
  });

  return call;
}

export async function acceptCall(user: AuthUser, call: ICall) {
  if (!env.CALLING_ENABLED) throw new AppError(503, 'WhatsApp calling is not enabled');
  call.status = 'CONNECTED';
  await call.save();
  await createCallEvent(call, 'call.connected');
  await emitToAuthorizedUsers(user.tenantId, call.conversationId.toString(), 'call.connected', {
    callId: call._id.toString(),
  });
  return call;
}

export async function rejectCall(user: AuthUser, call: ICall) {
  call.status = 'REJECTED';
  call.endedAt = new Date();
  await call.save();
  await createCallEvent(call, 'call.rejected');
  await emitToAuthorizedUsers(user.tenantId, call.conversationId.toString(), 'call.ended', {
    callId: call._id.toString(),
    status: 'REJECTED',
  });
  return call;
}

export async function endCall(user: AuthUser, call: ICall) {
  call.status = 'ENDED';
  call.endedAt = new Date();
  if (call.startedAt) {
    call.duration = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
  }
  await call.save();
  await createCallEvent(call, 'call.ended');
  await emitToAuthorizedUsers(user.tenantId, call.conversationId.toString(), 'call.ended', {
    callId: call._id.toString(),
    status: 'ENDED',
    duration: call.duration,
  });
  return call;
}

export async function processIncomingCallWebhook(
  tenantId: string,
  data: { callId: string; from: string; phoneNumberId: string }
) {
  const account = await WhatsAppAccount.findOne({ tenantId, phoneNumberId: data.phoneNumberId });
  if (!account) return;

  const contact = await Contact.findOne({ tenantId, whatsappId: data.from });
  if (!contact) return;

  const conversation = await Conversation.findOne({
    tenantId,
    contactId: contact._id,
    status: { $in: ['OPEN', 'PENDING'] },
  });
  if (!conversation) return;

  const call = await Call.create({
    tenantId,
    whatsappAccountId: account._id,
    conversationId: conversation._id,
    contactId: contact._id,
    direction: 'INCOMING',
    status: 'RINGING',
    metaCallId: data.callId,
    startedAt: new Date(),
  });

  await createCallEvent(call, 'call.incoming');
  await emitToAuthorizedUsers(tenantId, conversation._id.toString(), 'call.incoming', {
    call: call.toObject(),
  });
}
