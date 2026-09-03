import { IConversation } from '../../models/Conversation';
import { Contact } from '../../models/Contact';
import { User } from '../../models/User';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';
import { sendOutgoingMessage } from '../whatsapp/whatsappService';
import { logger } from '../../config/logger';

function buildAssignmentNotice(contactName: string | undefined, assigneeName: string): string {
  const firstName = contactName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return `${greeting} your chat has been assigned to ${assigneeName}. They will assist you shortly.`;
}

export async function sendContactAssignmentNotice(params: {
  conversation: IConversation;
  assigneeUserId: string;
  assignedByUserId: string;
}): Promise<void> {
  if (!params.conversation.contactId) return;

  const [account, contact, assignee] = await Promise.all([
    WhatsAppAccount.findById(params.conversation.whatsappAccountId),
    Contact.findById(params.conversation.contactId),
    User.findOne({
      _id: params.assigneeUserId,
      tenantId: params.conversation.tenantId,
      isActive: true,
    }),
  ]);

  if (!account || !contact || !assignee) return;

  const text = buildAssignmentNotice(contact.name, assignee.name);

  try {
    await sendOutgoingMessage(account, params.conversation, contact, {
      type: 'TEXT',
      content: { text },
      sentByUserId: params.assignedByUserId,
    });
  } catch (error) {
    logger.error(
      {
        error,
        conversationId: params.conversation._id.toString(),
        contactId: contact._id.toString(),
        assigneeUserId: params.assigneeUserId,
      },
      'Failed to send assignment notice to contact'
    );
  }
}
