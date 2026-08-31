import { Schema, model, Document, Types } from 'mongoose';

export interface ICallEvent extends Document {
  tenantId: string;
  callId: Types.ObjectId;
  eventType: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const callEventSchema = new Schema<ICallEvent>(
  {
    tenantId: { type: String, required: true, index: true },
    callId: { type: Schema.Types.ObjectId, ref: 'Call', required: true },
    eventType: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CallEvent = model<ICallEvent>('CallEvent', callEventSchema);
