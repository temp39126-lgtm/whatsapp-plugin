import { Schema, model, Document } from 'mongoose';

export interface ITenantNotificationSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  encryptedSmtpPassword?: string;
  fromEmail: string;
  fromName: string;
  emailOnAssignment: boolean;
  notifyAdminOnUnassigned: boolean;
  adminAlertEmail: string;
  dailyDigestEnabled: boolean;
}

export interface ITenantSettings extends Document {
  tenantId: string;
  notifications: ITenantNotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

const defaultNotifications: ITenantNotificationSettings = {
  enabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  fromEmail: '',
  fromName: 'WhatsApp CRM',
  emailOnAssignment: true,
  notifyAdminOnUnassigned: false,
  adminAlertEmail: '',
  dailyDigestEnabled: false,
};

const tenantSettingsSchema = new Schema<ITenantSettings>(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    notifications: {
      enabled: { type: Boolean, default: defaultNotifications.enabled },
      smtpHost: { type: String, default: defaultNotifications.smtpHost },
      smtpPort: { type: Number, default: defaultNotifications.smtpPort },
      smtpSecure: { type: Boolean, default: defaultNotifications.smtpSecure },
      smtpUser: { type: String, default: defaultNotifications.smtpUser },
      encryptedSmtpPassword: { type: String },
      fromEmail: { type: String, default: defaultNotifications.fromEmail },
      fromName: { type: String, default: defaultNotifications.fromName },
      emailOnAssignment: { type: Boolean, default: defaultNotifications.emailOnAssignment },
      notifyAdminOnUnassigned: {
        type: Boolean,
        default: defaultNotifications.notifyAdminOnUnassigned,
      },
      adminAlertEmail: { type: String, default: defaultNotifications.adminAlertEmail },
      dailyDigestEnabled: { type: Boolean, default: defaultNotifications.dailyDigestEnabled },
    },
  },
  { timestamps: true }
);

export const TenantSettings = model<ITenantSettings>('TenantSettings', tenantSettingsSchema);
export { defaultNotifications as DEFAULT_TENANT_NOTIFICATIONS };
