import { AuthUser } from '../../types';
import { Call, ICall } from '../../models/Call';
import { CallEvent } from '../../models/CallEvent';
import { Conversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';
import { buildConversationFilter, getAccessibleConversation } from '../rbac/conversationAccess';
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

export async function startCall(
  user: AuthUser,
  conversationId: string,
  session?: { sdp_type: 'offer'; sdp: string }
) {
  if (!env.CALLING_ENABLED) {
    throw new AppError(503, 'WhatsApp calling is not enabled for this account');
  }

  const conversation = await getAccessibleConversation(user, conversationId);

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
    const result = await initiateCall(account.phoneNumberId, contact.whatsappId, account, session);
    call.metaCallId = result.call_id;
    call.status = 'RINGING';
    await call.save();
    await createCallEvent(call, 'call.ringing');
  } catch (error) {
    call.status = 'FAILED';
    call.failureReason =
      error instanceof Error && error.message === 'CALL_SDP_REQUIRED'
        ? 'Outbound calls require WebRTC SDP from the client. Incoming calls are still supported.'
        : 'Meta calling API not available';
    await call.save();
    await createCallEvent(call, 'call.failed', { reason: call.failureReason });
  }

  await emitToAuthorizedUsers(user.tenantId, conversationId, 'call.ringing', {
    call: call.toObject(),
  });

  return call;
}

export async function acceptCall(
  user: AuthUser,
  call: ICall,
  session?: { sdp_type: 'answer'; sdp: string }
) {
  if (!env.CALLING_ENABLED) throw new AppError(503, 'WhatsApp calling is not enabled');

  if (call.metaCallId) {
    const account = await WhatsAppAccount.findById(call.whatsappAccountId);
    if (account) {
      try {
        const { acceptMetaCall } = await import('../whatsapp/metaApi');
        await acceptMetaCall(account.phoneNumberId, call.metaCallId, account, session);
      } catch {
        // Continue updating local state even if Meta accept fails in demo environments.
      }
    }
  }

  call.status = 'CONNECTED';
  await call.save();
  await createCallEvent(call, 'call.connected');
  await emitToAuthorizedUsers(user.tenantId, call.conversationId.toString(), 'call.connected', {
    callId: call._id.toString(),
  });
  return call;
}

export async function rejectCall(user: AuthUser, call: ICall) {
  if (call.metaCallId) {
    const account = await WhatsAppAccount.findById(call.whatsappAccountId);
    if (account) {
      try {
        const { rejectMetaCall } = await import('../whatsapp/metaApi');
        await rejectMetaCall(account.phoneNumberId, call.metaCallId, account);
      } catch {
        // Continue updating local state even if Meta reject fails in demo environments.
      }
    }
  }

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
  if (!env.CALLING_ENABLED) throw new AppError(503, 'WhatsApp calling is not enabled');

  if (call.metaCallId) {
    const account = await WhatsAppAccount.findById(call.whatsappAccountId);
    if (account) {
      try {
        const { terminateMetaCall } = await import('../whatsapp/metaApi');
        await terminateMetaCall(account.phoneNumberId, call.metaCallId, account);
      } catch {
        // Continue updating local state even if Meta terminate fails in demo environments.
      }
    }
  }

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

export async function processCallWebhook(
  tenantId: string,
  data: {
    callId: string;
    from?: string;
    to?: string;
    phoneNumberId: string;
    event?: string;
    direction?: string;
    session?: { sdp_type: string; sdp: string };
  }
) {
  if (
    data.event === 'connect' &&
    data.direction === 'BUSINESS_INITIATED' &&
    data.session?.sdp_type === 'answer'
  ) {
    const call = await Call.findOne({ tenantId, metaCallId: data.callId });
    if (!call) return;

    call.status = 'CONNECTED';
    await call.save();
    await createCallEvent(call, 'call.connected', { source: 'meta_webhook' });
    await emitToAuthorizedUsers(tenantId, call.conversationId.toString(), 'call.sdp-answer', {
      metaCallId: data.callId,
      callId: call._id.toString(),
      conversationId: call.conversationId.toString(),
      session: {
        sdp_type: 'answer',
        sdp: data.session.sdp,
      },
    });
    return;
  }

  if (data.event === 'terminate') {
    const call = await Call.findOne({ tenantId, metaCallId: data.callId });
    if (!call || call.status === 'ENDED') return;
    call.status = 'ENDED';
    call.endedAt = new Date();
    if (call.startedAt) {
      call.duration = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
    }
    await call.save();
    await createCallEvent(call, 'call.ended', { source: 'meta_webhook' });
    await emitToAuthorizedUsers(tenantId, call.conversationId.toString(), 'call.ended', {
      callId: call._id.toString(),
      status: 'ENDED',
      duration: call.duration,
    });
    return;
  }

  if (data.event === 'connect' && data.direction === 'USER_INITIATED' && data.from) {
    await processIncomingCallWebhook(tenantId, {
      callId: data.callId,
      from: data.from,
      phoneNumberId: data.phoneNumberId,
      session:
        data.session?.sdp_type === 'offer'
          ? { sdp_type: 'offer', sdp: data.session.sdp }
          : undefined,
    });
  }
}

export async function processIncomingCallWebhook(
  tenantId: string,
  data: {
    callId: string;
    from: string;
    phoneNumberId: string;
    session?: { sdp_type: 'offer'; sdp: string };
  }
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
    ...(data.session ? { session: data.session } : {}),
  });
}
