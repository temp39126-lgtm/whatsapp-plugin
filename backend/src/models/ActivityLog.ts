import { Schema, model, Document } from 'mongoose';

export interface IActivityLog extends Document {
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ tenantId: 1, createdAt: -1 });

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema);
