import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  tenantId: string;
  conversationId: Types.ObjectId;
  contactId: Types.ObjectId;
  metaMessageId?: string;
  direction: 'INCOMING' | 'OUTGOING';
  type: string;
  content: unknown;
  replyToMessageId?: Types.ObjectId;
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentByUserId?: string;
  isPinned: boolean;
  isStarred: boolean;
  deletedAt?: Date;
  deletedForEveryone?: boolean;
  deletedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    tenantId: { type: String, required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    metaMessageId: { type: String },
    direction: { type: String, enum: ['INCOMING', 'OUTGOING'], required: true },
    type: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    replyToMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    status: {
      type: String,
      enum: ['SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'SENDING',
    },
    sentByUserId: { type: String },
    isPinned: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedForEveryone: { type: Boolean, default: false },
    deletedByUserId: { type: String },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ tenantId: 1, metaMessageId: 1 }, { unique: true, sparse: true });
messageSchema.index({ tenantId: 1, direction: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', messageSchema);
