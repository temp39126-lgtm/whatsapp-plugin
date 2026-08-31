import { Schema, model, Document, Types } from 'mongoose';

export interface IInternalNote extends Document {
  tenantId: string;
  conversationId: Types.ObjectId;
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const internalNoteSchema = new Schema<IInternalNote>(
  {
    tenantId: { type: String, required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    content: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const InternalNote = model<IInternalNote>('InternalNote', internalNoteSchema);
