import { AuthUser, AppError } from '../../types';
import { IConversation } from '../../models/Conversation';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';
import { Contact } from '../../models/Contact';
import { Message } from '../../models/Message';
import { Conversation } from '../../models/Conversation';
import { fetchAllMessageTemplates, sendTemplateMessage, MetaApiError } from '../whatsapp/metaApi';
import { emitToAuthorizedUsers } from '../realtime/socketService';

interface WhatsAppTemplate {
  name: string;
  status: string;
  language: string;
  category?: string;
  components?: Array<Record<string, unknown>>;
}

async function getConversationResources(
  user: AuthUser,
  conversation: IConversation
) {
  if (conversation.tenantId !== user.tenantId) {
    throw new AppError(403, 'Access denied to this conversation');
  }

  if (conversation.groupId || !conversation.contactId) {
    throw new AppError(400, 'Templates can only be sent to individual contacts');
  }

  const [account, contact] = await Promise.all([
    WhatsAppAccount.findOne({
      _id: conversation.whatsappAccountId,
      tenantId: user.tenantId,
    }),
    Contact.findOne({
      _id: conversation.contactId,
      tenantId: user.tenantId,
    }),
  ]);

  if (!account || !contact) {
    throw new AppError(404, 'WhatsApp account or contact not found');
  }

  if (account.connectionStatus !== 'CONNECTED') {
    throw new AppError(400, 'WhatsApp account is not connected');
  }

  return { account, contact };
}

export async function getApprovedTemplates(
  user: AuthUser,
  conversation: IConversation
) {
  const { account } = await getConversationResources(user, conversation);

  const templates = await fetchAllMessageTemplates<WhatsAppTemplate>(
    account.businessAccountId,
    account,
    'name,status,language,category,components'
  );

  return templates
    .filter((template) => template.status === 'APPROVED')
    .map((template) => ({
      name: template.name,
      language: template.language,
      category: template.category,
      components: template.components ?? [],
    }));
}

export async function sendApprovedTemplate(
  user: AuthUser,
  conversation: IConversation,
  input: {
    templateName: string;
    languageCode: string;
    components?: Array<Record<string, unknown>>;
  }
) {
  const templateName = input.templateName?.trim();
  const languageCode = input.languageCode?.trim();

  if (!templateName || !languageCode) {
    throw new AppError(400, 'Template name and language are required');
  }

  if (
    input.components !== undefined &&
    (!Array.isArray(input.components) || input.components.length > 20)
  ) {
    throw new AppError(400, 'Invalid template components');
  }

  const { account, contact } = await getConversationResources(user, conversation);

  const templates = await fetchAllMessageTemplates<WhatsAppTemplate>(
    account.businessAccountId,
    account,
    'name,status,language,category,components'
  );

  const approvedTemplate = templates.find(
    (template) =>
      template.status === 'APPROVED' &&
      template.name === templateName &&
      template.language === languageCode
  );

  if (!approvedTemplate) {
    throw new AppError(
      400,
      'This template is not approved or is unavailable in the selected language'
    );
  }

  const components = input.components ?? [];
  const preview = `Template: ${templateName}`;

  const message = await Message.create({
    tenantId: user.tenantId,
    conversationId: conversation._id,
    contactId: contact._id,
    metaMessageId: `local-template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    direction: 'OUTGOING',
    type: 'TEMPLATE',
    content: {
      templateName,
      languageCode,
      components,
      preview,
      text: preview,
    },
    status: 'SENDING',
    sentByUserId: user.userId,
  });

  try {
    const metaResponse = await sendTemplateMessage(
      account.phoneNumberId,
      contact.whatsappId,
      templateName,
      languageCode,
      account,
      components
    );

    const metaMessageId = metaResponse.messages?.[0]?.id;

    if (!metaMessageId) {
      throw new Error('Meta did not return a message ID');
    }

    message.metaMessageId = metaMessageId;
    message.status = 'SENT';
  } catch (error) {
    message.status = 'FAILED';

    if (error instanceof MetaApiError) {
      message.errorCode = error.code;
      message.errorTitle = error.title;
      message.errorMessage = error.message;
      message.errorDetails = error.details;
    } else {
      message.errorMessage =
        error instanceof Error ? error.message : 'Template sending failed';
    }
  }

  await message.save();

  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: preview,
    lastMessageAt: new Date(),
  });

  await emitToAuthorizedUsers(
    user.tenantId,
    conversation._id.toString(),
    'message.created',
    {
      message: message.toObject(),
      conversationId: conversation._id.toString(),
    }
  );

  await emitToAuthorizedUsers(
    user.tenantId,
    conversation._id.toString(),
    'conversation.updated',
    {
      conversationId: conversation._id.toString(),
      lastMessage: preview,
    }
  );

  return message.toObject();
}
