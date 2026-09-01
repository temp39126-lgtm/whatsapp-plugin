export interface NotificationPreferences {
  messageAlerts: boolean;
  sound: boolean;
  desktopNotifications: boolean;
  emailSummary: boolean;
  emailOnAssignment: boolean;
}

export interface PrivacyPreferences {
  readReceipts: boolean;
  showOnlineStatus: boolean;
  showProfilePhoto: boolean;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notifications: {
    messageAlerts: true,
    sound: true,
    desktopNotifications: true,
    emailSummary: false,
    emailOnAssignment: true,
  },
  privacy: {
    readReceipts: true,
    showOnlineStatus: true,
    showProfilePhoto: true,
  },
};
