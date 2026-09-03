import { Schema, model, Document } from 'mongoose';

export type NotificationType = 'message' | 'assignment' | 'unassigned';

export interface INotification extends Document {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  conversationId?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['message', 'assignment', 'unassigned'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    href: { type: String, required: true },
    conversationId: { type: String },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ tenantId: 1, userId: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
