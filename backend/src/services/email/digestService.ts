import { User } from '../../models/User';
import { Conversation } from '../../models/Conversation';
import { buildConversationFilter } from '../rbac/conversationAccess';
import { userToAuthUser } from '../auth/authService';
import { sendDailyDigestEmail } from '../email/emailService';
import { logger } from '../../config/logger';

export async function sendDailyDigestEmails(): Promise<number> {
  const users = await User.find({
    isActive: true,
    'preferences.notifications.emailSummary': true,
  }).lean();

  let sentCount = 0;

  for (const user of users) {
    const authUser = userToAuthUser(user);
    const unreadCount = await Conversation.countDocuments({
      ...buildConversationFilter(authUser),
      unreadCount: { $gt: 0 },
    });

    if (unreadCount === 0) continue;

    try {
      const delivered = await sendDailyDigestEmail({
        tenantId: user.tenantId,
        to: user.email,
        name: user.name,
        unreadCount,
      });
      if (delivered) sentCount += 1;
    } catch (error) {
      logger.error({ err: error, userId: user._id.toString() }, 'Failed to send daily digest email');
    }
  }

  return sentCount;
}

let digestTimer: NodeJS.Timeout | null = null;

export function scheduleDailyDigestEmails(): void {
  if (digestTimer) return;

  const run = async () => {
    try {
      const sent = await sendDailyDigestEmails();
      if (sent > 0) {
        logger.info({ sent }, 'Daily digest emails sent');
      }
    } catch (error) {
      logger.error({ err: error }, 'Daily digest job failed');
    }
  };

  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setUTCHours(9, 0, 0, 0);
  if (nextRun <= now) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }

  const initialDelay = nextRun.getTime() - now.getTime();
  setTimeout(() => {
    void run();
    digestTimer = setInterval(() => void run(), 24 * 60 * 60 * 1000);
  }, initialDelay);
}
