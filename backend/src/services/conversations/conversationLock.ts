import mongoose from 'mongoose';
import { IConversation } from '../../models/Conversation';
import { AppError } from '../../types';

export function assertConversationVersion(
  conversation: IConversation,
  expectedVersion?: number
): void {
  if (expectedVersion === undefined) {
    return;
  }

  if (conversation.__v !== expectedVersion) {
    throw new AppError(
      409,
      'Conversation was modified by another user. Please refresh and try again.'
    );
  }
}

export async function saveConversationWithVersion(
  conversation: IConversation,
  expectedVersion: number | undefined,
  apply: () => void
): Promise<IConversation> {
  assertConversationVersion(conversation, expectedVersion);
  apply();

  try {
    await conversation.save();
    return conversation;
  } catch (error) {
    if (error instanceof mongoose.Error.VersionError) {
      throw new AppError(
        409,
        'Conversation was modified by another user. Please refresh and try again.'
      );
    }
    throw error;
  }
}
