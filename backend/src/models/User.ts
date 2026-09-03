import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'ADMIN' | 'USER';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  profileImage?: string;
  about?: string;
  tokenVersion: number;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  preferences?: {
    notifications?: {
      messageAlerts?: boolean;
      sound?: boolean;
      desktopNotifications?: boolean;
      emailSummary?: boolean;
      emailOnAssignment?: boolean;
    };
    privacy?: {
      readReceipts?: boolean;
      showOnlineStatus?: boolean;
      showProfilePhoto?: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'USER'], required: true },
    tenantId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    profileImage: { type: String },
    about: { type: String, default: '', maxlength: 139 },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    preferences: {
      notifications: {
        messageAlerts: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
        desktopNotifications: { type: Boolean, default: true },
        emailSummary: { type: Boolean, default: false },
        emailOnAssignment: { type: Boolean, default: true },
      },
      privacy: {
        readReceipts: { type: Boolean, default: true },
        showOnlineStatus: { type: Boolean, default: true },
        showProfilePhoto: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, tenantId: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', userSchema);
