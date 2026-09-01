import { Schema, model, Document, Types } from 'mongoose';

export interface IGroup extends Document {
  tenantId: string;
  name: string;
  contactIds: Types.ObjectId[];
  profileImage?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    contactIds: [{ type: Schema.Types.ObjectId, ref: 'Contact' }],
    profileImage: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

groupSchema.index({ tenantId: 1, name: 1 });

export const Group = model<IGroup>('Group', groupSchema);
