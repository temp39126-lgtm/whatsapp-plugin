export interface TenantNotificationSettingsDTO {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPasswordConfigured: boolean;
  fromEmail: string;
  fromName: string;
  emailOnAssignment: boolean;
  notifyAdminOnUnassigned: boolean;
  adminAlertEmail: string;
  dailyDigestEnabled: boolean;
}

export interface UpdateTenantNotificationSettingsInput {
  enabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  fromEmail?: string;
  fromName?: string;
  emailOnAssignment?: boolean;
  notifyAdminOnUnassigned?: boolean;
  adminAlertEmail?: string;
  dailyDigestEnabled?: boolean;
}
