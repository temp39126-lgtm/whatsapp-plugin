import { AuthUser } from '../../types';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { Call } from '../../models/Call';
import { InternalNote } from '../../models/InternalNote';
import { User } from '../../models/User';
import { ActivityLog } from '../../models/ActivityLog';

export async function getConversationAnalytics(user: AuthUser) {
  const tenantId = user.tenantId;
  const [total, open, pending, resolved, closed, unread, newToday] = await Promise.all([
    Conversation.countDocuments({ tenantId }),
    Conversation.countDocuments({ tenantId, status: 'OPEN' }),
    Conversation.countDocuments({ tenantId, status: 'PENDING' }),
    Conversation.countDocuments({ tenantId, status: 'RESOLVED' }),
    Conversation.countDocuments({ tenantId, status: 'CLOSED' }),
    Conversation.countDocuments({ tenantId, unreadCount: { $gt: 0 } }),
    Conversation.countDocuments({
      tenantId,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
  ]);

  return { total, newToday, open, pending, resolved, closed, unread };
}

export async function getMessageAnalytics(user: AuthUser, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [sent, received] = await Promise.all([
    Message.countDocuments({ tenantId: user.tenantId, direction: 'OUTGOING', createdAt: { $gte: since } }),
    Message.countDocuments({ tenantId: user.tenantId, direction: 'INCOMING', createdAt: { $gte: since } }),
  ]);

  return { sent, received, period: days };
}

export async function getAgentAnalytics(user: AuthUser) {
  const pipeline = [
    { $match: { tenantId: user.tenantId, assignedUserId: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$assignedUserId',
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
        open: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
      },
    },
  ];

  return Conversation.aggregate(pipeline);
}

export async function getCallAnalytics(user: AuthUser) {
  const tenantId = user.tenantId;
  const [
    total,
    incoming,
    outgoing,
    connected,
    missed,
    rejected,
    failed,
    durationAgg,
  ] = await Promise.all([
    Call.countDocuments({ tenantId }),
    Call.countDocuments({ tenantId, direction: 'INCOMING' }),
    Call.countDocuments({ tenantId, direction: 'OUTGOING' }),
    Call.countDocuments({ tenantId, status: 'CONNECTED' }),
    Call.countDocuments({ tenantId, status: 'MISSED' }),
    Call.countDocuments({ tenantId, status: 'REJECTED' }),
    Call.countDocuments({ tenantId, status: 'FAILED' }),
    Call.aggregate([
      { $match: { tenantId, duration: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, totalDuration: { $sum: '$duration' }, avgDuration: { $avg: '$duration' } } },
    ]),
  ]);

  const duration = durationAgg[0] ?? { totalDuration: 0, avgDuration: 0 };

  return {
    total,
    incoming,
    outgoing,
    answered: connected,
    missed,
    rejected,
    failed,
    totalDuration: duration.totalDuration,
    averageDuration: Math.round(duration.avgDuration ?? 0),
  };
}

export async function getActivityHistory(user: AuthUser, resourceType: string, resourceId: string) {
  return ActivityLog.find({ tenantId: user.tenantId, resourceType, resourceId })
    .sort({ createdAt: -1 })
    .limit(50);
}

export async function createInternalNote(
  user: AuthUser,
  conversationId: string,
  content: string
) {
  return InternalNote.create({
    tenantId: user.tenantId,
    conversationId,
    content,
    createdBy: user.userId,
  });
}

export async function listInternalNotes(user: AuthUser, conversationId: string) {
  const notes = await InternalNote.find({ tenantId: user.tenantId, conversationId })
    .sort({ createdAt: -1 })
    .lean();

  const userIds = [...new Set(notes.map((note) => note.createdBy))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }, 'name email').lean()
    : [];
  const userMap = new Map(users.map((entry) => [entry._id.toString(), entry]));

  return notes.map((note) => ({
    ...note,
    author: userMap.get(note.createdBy)
      ? {
          _id: note.createdBy,
          name: userMap.get(note.createdBy)!.name,
          email: userMap.get(note.createdBy)!.email,
        }
      : { _id: note.createdBy, name: 'Unknown', email: '' },
  }));
}

export async function listTeamUsers(user: AuthUser) {
  return User.find({ tenantId: user.tenantId }, 'name email role').sort({ name: 1 }).lean();
}

export async function getTeamWorkload(user: AuthUser) {
  return Conversation.aggregate([
    { $match: { tenantId: user.tenantId, assignedUserId: { $exists: true } } },
    {
      $group: {
        _id: '$assignedUserId',
        open: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);
}
