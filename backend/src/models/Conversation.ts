import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  tenantId: string;
  whatsappAccountId: Types.ObjectId;
  contactId?: Types.ObjectId;
  groupId?: Types.ObjectId;
  assignedUserId?: string;
  permittedUsers: string[];
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  tags: Types.ObjectId[];
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    tenantId: { type: String, required: true, index: true },
    whatsappAccountId: { type: Schema.Types.ObjectId, ref: 'WhatsAppAccount', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', index: true },
    assignedUserId: { type: String },
    permittedUsers: [{ type: String }],
    status: {
      type: String,
      enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
    },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    unreadCount: { type: Number, default: 0 },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

conversationSchema.index({ tenantId: 1, assignedUserId: 1 });
conversationSchema.index({ tenantId: 1, status: 1 });
conversationSchema.index({ tenantId: 1, lastMessageAt: -1 });
conversationSchema.index({ tenantId: 1, unreadCount: 1 });
conversationSchema.index({ tenantId: 1, groupId: 1 }, { unique: true, sparse: true });

conversationSchema.pre('validate', function validateConversationTarget(next) {
  if (!this.contactId && !this.groupId) {
    next(new Error('Either contactId or groupId is required'));
  } else {
    next();
  }
});

export const Conversation = model<IConversation>('Conversation', conversationSchema);
