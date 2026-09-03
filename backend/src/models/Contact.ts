import { Schema, model, Document, Types } from 'mongoose';

export interface IContact extends Document {
  tenantId: string;
  whatsappAccountId: Types.ObjectId;
  name: string;
  phone: string;
  whatsappId: string;
  profileImage?: string;
  assignedUserId?: string;
  tags: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    tenantId: { type: String, required: true, index: true },
    whatsappAccountId: { type: Schema.Types.ObjectId, ref: 'WhatsAppAccount', required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    whatsappId: { type: String, required: true },
    profileImage: { type: String },
    assignedUserId: { type: String },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  },
  { timestamps: true }
);

contactSchema.index({ tenantId: 1, phone: 1 });
contactSchema.index({ tenantId: 1, whatsappId: 1 }, { unique: true });
contactSchema.index({ tenantId: 1, name: 1 });
contactSchema.index({ tenantId: 1, updatedAt: -1 });

export const Contact = model<IContact>('Contact', contactSchema);
