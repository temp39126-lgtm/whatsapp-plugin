import { Schema, model, Document, Types } from 'mongoose';

export interface IMessageMedia extends Document {
  tenantId: string;
  messageId: Types.ObjectId;
  metaMediaId?: string;
  mediaType: string;
  mimeType: string;
  fileName?: string;
  fileSize?: number;
  storageKey: string;
  createdAt: Date;
}

const messageMediaSchema = new Schema<IMessageMedia>(
  {
    tenantId: { type: String, required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    metaMediaId: { type: String },
    mediaType: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileName: { type: String },
    fileSize: { type: Number },
    storageKey: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MessageMedia = model<IMessageMedia>('MessageMedia', messageMediaSchema);
