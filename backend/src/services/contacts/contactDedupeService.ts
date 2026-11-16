import { Types } from 'mongoose';
import { Contact, IContact } from '../../models/Contact';
import { Conversation } from '../../models/Conversation';
import { Message } from '../../models/Message';
import { Call } from '../../models/Call';
import { dedupeContactConversations } from './contactConversationService';

export async function mergeDuplicateContacts(
  tenantId: string,
  contacts: IContact[],
  canonicalWhatsAppId: string
): Promise<IContact> {
  if (contacts.length === 0) {
    throw new Error('mergeDuplicateContacts requires at least one contact');
  }

  const sorted = [...contacts].sort((left, right) => {
    const lockedScore = Number(Boolean(right.crmDisplayNameLocked)) - Number(Boolean(left.crmDisplayNameLocked));
    if (lockedScore !== 0) return lockedScore;
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });

  const primary = sorted[0];
  const duplicates = sorted.slice(1);

  if (primary.whatsappId !== canonicalWhatsAppId) {
    primary.whatsappId = canonicalWhatsAppId;
    await primary.save();
  }

  for (const duplicate of duplicates) {
    const duplicateId = duplicate._id;
    await Conversation.updateMany({ tenantId, contactId: duplicateId }, { contactId: primary._id });
    await Message.updateMany({ tenantId, contactId: duplicateId }, { contactId: primary._id });
    await Call.updateMany({ tenantId, contactId: duplicateId }, { contactId: primary._id });
    await Contact.deleteOne({ _id: duplicateId });
  }

  await dedupeContactConversations(tenantId, primary._id as Types.ObjectId);
  return primary;
}

export async function findAndMergeContactsByWhatsAppVariants(
  tenantId: string,
  lookupIds: string[],
  canonicalWhatsAppId: string
): Promise<IContact | null> {
  const matches = await Contact.find({ tenantId, whatsappId: { $in: lookupIds } });
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return mergeDuplicateContacts(tenantId, matches, canonicalWhatsAppId);
}