import { Schema, model, Document } from 'mongoose';

export type OtpPurpose = 'login' | 'signup' | 'password_reset';

export interface IOtpPayload {
  userId?: string;
  name?: string;
  passwordHash?: string;
}

export interface IAuthOtpChallenge extends Document {
  challengeId: string;
  email: string;
  tenantId: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  payload: IOtpPayload;
  createdAt: Date;
  updatedAt: Date;
}

const authOtpChallengeSchema = new Schema<IAuthOtpChallenge>(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    tenantId: { type: String, required: true, index: true },
    purpose: { type: String, enum: ['login', 'signup', 'password_reset'], required: true },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    payload: {
      userId: { type: String },
      name: { type: String },
      passwordHash: { type: String, select: false },
    },
  },
  { timestamps: true }
);

authOtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthOtpChallenge = model<IAuthOtpChallenge>(
  'AuthOtpChallenge',
  authOtpChallengeSchema
);
