import { Schema, model, Document, Types } from 'mongoose';

export interface IConversationAssignment extends Document {
  tenantId: string;
  conversationId: Types.ObjectId;
  assignedUserId: string;
  assignedBy: string;
  assignedAt: Date;
}

const conversationAssignmentSchema = new Schema<IConversationAssignment>({
  tenantId: { type: String, required: true, index: true },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  assignedUserId: { type: String, required: true },
  assignedBy: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
});

export const ConversationAssignment = model<IConversationAssignment>(
  'ConversationAssignment',
  conversationAssignmentSchema
);
