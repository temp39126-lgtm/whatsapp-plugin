import { Schema, model, Document } from 'mongoose';

export interface ITag extends Document {
  tenantId: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

tagSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Tag = model<ITag>('Tag', tagSchema);
