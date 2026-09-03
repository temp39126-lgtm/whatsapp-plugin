import { Schema, model, Document, Types } from 'mongoose';

export interface ICall extends Document {
  tenantId: string;
  whatsappAccountId: Types.ObjectId;
  conversationId: Types.ObjectId;
  contactId: Types.ObjectId;
  initiatedByUserId?: string;
  direction: 'INCOMING' | 'OUTGOING';
  status: string;
  metaCallId?: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<ICall>(
  {
    tenantId: { type: String, required: true, index: true },
    whatsappAccountId: { type: Schema.Types.ObjectId, ref: 'WhatsAppAccount', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    initiatedByUserId: { type: String },
    direction: { type: String, enum: ['INCOMING', 'OUTGOING'], required: true },
    status: {
      type: String,
      enum: ['INITIATING', 'RINGING', 'CONNECTED', 'ENDED', 'MISSED', 'REJECTED', 'FAILED'],
      default: 'INITIATING',
    },
    metaCallId: { type: String },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number },
    failureReason: { type: String },
  },
  { timestamps: true }
);

callSchema.index({ tenantId: 1, createdAt: -1 });
callSchema.index({ tenantId: 1, status: 1 });
callSchema.index({ tenantId: 1, direction: 1 });
callSchema.index({ tenantId: 1, metaCallId: 1 }, { unique: true, sparse: true });
callSchema.index({ tenantId: 1, conversationId: 1, status: 1 });

export const Call = model<ICall>('Call', callSchema);
