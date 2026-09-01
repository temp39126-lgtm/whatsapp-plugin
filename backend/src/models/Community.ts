import { Schema, model, Document, Types } from 'mongoose';

export interface ICommunity extends Document {
  tenantId: string;
  name: string;
  description?: string;
  groupIds: Types.ObjectId[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const communitySchema = new Schema<ICommunity>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    groupIds: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

communitySchema.index({ tenantId: 1, name: 1 });

export const Community = model<ICommunity>('Community', communitySchema);
