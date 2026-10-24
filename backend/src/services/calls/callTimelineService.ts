import { ICall } from '../../models/Call';
import { Message } from '../../models/Message';
import { Conversation } from '../../models/Conversation';
import { emitToAuthorizedUsers } from '../realtime/socketService';

function formatDuration(seconds?: number): string | undefined {
  if (seconds === undefined || seconds <= 0) return undefined;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
}

export function formatCallTimelineLabel(call: Pick<ICall, 'direction' | 'status' | 'duration'>): string {
  const duration = formatDuration(call.duration);

  if (call.status === 'FAILED') {
    return call.direction === 'OUTGOING' ? 'Outgoing call failed' : 'Incoming call failed';
  }
  if (call.status === 'REJECTED') {
    return call.direction === 'INCOMING' ? 'Declined incoming call' : 'Call declined';
  }
  if (call.status === 'MISSED') {
    return 'Missed voice call';
  }
  if (call.status === 'RINGING' || call.status === 'INITIATING') {
    return call.direction === 'OUTGOING' ? 'Outgoing call' : 'Incoming call';
  }
  if (call.status === 'CONNECTED') {
    return duration ? `Voice call · ${duration}` : 'Voice call';
  }
  if (call.status === 'ENDED') {
    return duration ? `Voice call · ${duration}` : 'Voice call ended';
  }
  return 'Voice call';
}

export async function upsertCallTimelineMessage(call: ICall): Promise<void> {
  const callId = call._id.toString();
  const label = formatCallTimelineLabel(call);
  const content = {
    callId,
    direction: call.direction,
    status: call.status,
    duration: call.duration,
    label,
  };

  const messageDirection = call.direction === 'OUTGOING' ? 'OUTGOING' : 'INCOMING';

  let message = await Message.findOne({
    tenantId: call.tenantId,
    conversationId: call.conversationId,
    type: 'CALL',
    'content.callId': callId,
  });

  if (message) {
    message.content = content;
    message.direction = messageDirection;
    await message.save();
    await emitToAuthorizedUsers(
      call.tenantId,
      call.conversationId.toString(),
      'message.updated',
      { messageId: message._id.toString(), message: message.toObject() }
    );
  } else {
    message = await Message.create({
      tenantId: call.tenantId,
      conversationId: call.conversationId,
      contactId: call.contactId,
      direction: messageDirection,
      type: 'CALL',
      content,
      status: 'DELIVERED',
    });
    await emitToAuthorizedUsers(call.tenantId, call.conversationId.toString(), 'message.created', {
      message: message.toObject(),
      conversationId: call.conversationId.toString(),
    });
  }

  await Conversation.findByIdAndUpdate(call.conversationId, {
    lastMessage: label,
    lastMessageAt: new Date(),
  });

  await emitToAuthorizedUsers(call.tenantId, call.conversationId.toString(), 'conversation.updated', {
    conversationId: call.conversationId.toString(),
    lastMessage: label,
  });
}

function previewFromMessage(message: {
  type: string;
  content: unknown;
}): string {
  if (message.type === 'CALL' && message.content && typeof message.content === 'object') {
    const label = (message.content as { label?: string }).label;
    if (label) return label;
  }
  if (message.content && typeof message.content === 'object' && 'text' in message.content) {
    const text = String((message.content as { text?: string }).text ?? '').trim();
    if (text) return text.slice(0, 240);
  }
  return 'Message';
}

export async function refreshConversationLastMessage(conversationId: unknown): Promise<void> {
  const latest = await Message.findOne({ conversationId })
    .sort({ createdAt: -1 })
    .select('type content createdAt')
    .lean();

  if (!latest) {
    await Conversation.findByIdAndUpdate(conversationId, {
      $unset: { lastMessage: '', lastMessageAt: '' },
    });
    return;
  }

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: previewFromMessage(latest),
    lastMessageAt: latest.createdAt,
  });
}

export async function removeCallTimelineMessages(
  tenantId: string,
  conversationId: unknown,
  callId: string
): Promise<void> {
  await Message.deleteMany({
    tenantId,
    conversationId,
    type: 'CALL',
    'content.callId': callId,
  });
  await refreshConversationLastMessage(conversationId);
}
