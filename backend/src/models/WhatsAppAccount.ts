import { Schema, model, Document } from 'mongoose';

export interface IWhatsAppAccount extends Document {
  tenantId: string;
  phoneNumberId: string;
  businessAccountId: string;
  displayPhoneNumber: string;
  encryptedAccessToken: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'PENDING';
  webhookConfigured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppAccountSchema = new Schema<IWhatsAppAccount>(
  {
    tenantId: { type: String, required: true, index: true },
    phoneNumberId: { type: String, required: true, index: true },
    businessAccountId: { type: String, required: true, index: true },
    displayPhoneNumber: { type: String, required: true },
    encryptedAccessToken: { type: String, required: true },
    connectionStatus: {
      type: String,
      enum: ['CONNECTED', 'DISCONNECTED', 'PENDING'],
      default: 'PENDING',
    },
    webhookConfigured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

whatsAppAccountSchema.index({ tenantId: 1, phoneNumberId: 1 }, { unique: true });

export const WhatsAppAccount = model<IWhatsAppAccount>('WhatsAppAccount', whatsAppAccountSchema);
