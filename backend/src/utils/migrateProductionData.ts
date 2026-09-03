import { Contact } from '../models/Contact';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Call } from '../models/Call';
import { logger } from '../config/logger';
import { normalizeWhatsAppId } from './phone';
import { dedupeContactConversations } from '../services/contacts/contactConversationService';

export async function migrateProductionData(): Promise<void> {
  await migrateDuplicateContacts();
  await dedupeAllContactConversations();
}

async function migrateDuplicateContacts(): Promise<void> {
  const tenantIds = await Contact.distinct('tenantId');

  for (const tenantId of tenantIds) {
    const contacts = await Contact.find({ tenantId }).sort({ updatedAt: -1 });
    const groups = new Map<string, typeof contacts>();

    for (const contact of contacts) {
      const key = normalizeWhatsAppId(contact.whatsappId);
      const bucket = groups.get(key) ?? [];
      bucket.push(contact);
      groups.set(key, bucket);
    }

    for (const [whatsappId, bucket] of groups) {
      if (bucket.length <= 1) {
        continue;
      }

      const keeper = bucket[0];
      const duplicates = bucket.slice(1);

      for (const duplicate of duplicates) {
        await Promise.all([
          Conversation.updateMany({ contactId: duplicate._id }, { contactId: keeper._id }),
          Message.updateMany({ contactId: duplicate._id }, { contactId: keeper._id }),
          Call.updateMany({ contactId: duplicate._id }, { contactId: keeper._id }),
          Contact.deleteOne({ _id: duplicate._id }),
        ]);
      }

      if (keeper.whatsappId !== whatsappId) {
        await Contact.updateOne({ _id: keeper._id }, { whatsappId });
      }

      logger.info(
        { tenantId, whatsappId, merged: duplicates.length },
        'Merged duplicate contacts'
      );
    }
  }
}

async function dedupeAllContactConversations(): Promise<void> {
  const contactIds = await Conversation.distinct('contactId', {
    contactId: { $exists: true },
    groupId: { $exists: false },
  });

  for (const contactId of contactIds) {
    if (!contactId) continue;
    const conversation = await Conversation.findOne({ contactId }).select('tenantId');
    if (!conversation) continue;
    await dedupeContactConversations(conversation.tenantId, contactId);
  }
}
