import { Schema, model, Document, Types } from 'mongoose';

export interface IMessageReaction extends Document {
  tenantId: string;
  messageId: Types.ObjectId;
  emoji: string;
  reactedBy: string;
  reactedAt: Date;
}

const messageReactionSchema = new Schema<IMessageReaction>({
  tenantId: { type: String, required: true, index: true },
  messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
  emoji: { type: String, required: true },
  reactedBy: { type: String, required: true },
  reactedAt: { type: Date, default: Date.now },
});

messageReactionSchema.index({ messageId: 1, reactedBy: 1 }, { unique: true });

export const MessageReaction = model<IMessageReaction>('MessageReaction', messageReactionSchema);
