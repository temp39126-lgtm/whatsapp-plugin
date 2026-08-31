import { Schema, model, Document, Types } from 'mongoose';

export interface IConversationRead extends Document {
  tenantId: string;
  conversationId: Types.ObjectId;
  userId: string;
  lastReadMessageId?: Types.ObjectId;
  lastReadAt: Date;
}

const conversationReadSchema = new Schema<IConversationRead>({
  tenantId: { type: String, required: true, index: true },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  userId: { type: String, required: true },
  lastReadMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  lastReadAt: { type: Date, default: Date.now },
});

conversationReadSchema.index({ tenantId: 1, conversationId: 1, userId: 1 }, { unique: true });

export const ConversationRead = model<IConversationRead>('ConversationRead', conversationReadSchema);
