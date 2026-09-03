import { AuthUser } from '../../types';
import { Contact, IContact } from '../../models/Contact';
import { Conversation, IConversation } from '../../models/Conversation';
import { Call } from '../../models/Call';
import { Group } from '../../models/Group';
import { Message } from '../../models/Message';
import { InternalNote } from '../../models/InternalNote';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { AppError } from '../../types';
import { logActivity } from '../rbac/activityLog';
import { storeAvatar } from '../avatars/avatarService';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';
import { escapeRegExp } from '../../utils/regex';

function normalizePhoneInput(phone: string): { phone: string; whatsappId: string } {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 8 || digits.length > 15) {
    throw new AppError(400, 'Enter a valid phone number with country code');
  }

  const formatted = trimmed.startsWith('+') ? `+${digits}` : `+${digits}`;
  return { phone: formatted, whatsappId: digits };
}

export async function createContact(
  user: AuthUser,
  input: { name: string; phone: string }
) {
  const account = await WhatsAppAccount.findOne({ tenantId: user.tenantId });
  if (!account) {
    throw new AppError(400, 'WhatsApp is not configured for this workspace');
  }

  const { phone, whatsappId } = normalizePhoneInput(input.phone);
  const existing = await Contact.findOne({ tenantId: user.tenantId, whatsappId });
  if (existing) {
    throw new AppError(409, 'A contact with this phone number already exists');
  }

  const assignToCreator = user.role === 'USER';

  const contact = await Contact.create({
    tenantId: user.tenantId,
    whatsappAccountId: account._id,
    name: input.name.trim(),
    phone,
    whatsappId,
    tags: [],
    ...(assignToCreator ? { assignedUserId: user.userId } : {}),
  });

  await Conversation.create({
    tenantId: user.tenantId,
    whatsappAccountId: account._id,
    contactId: contact._id,
    status: 'OPEN',
    priority: 'NORMAL',
    unreadCount: 0,
    lastMessage: '',
    lastMessageAt: new Date(),
    ...(assignToCreator ? { assignedUserId: user.userId } : {}),
  });

  await logActivity(user, 'contact.created', 'contact', contact._id.toString(), {
    name: contact.name,
    phone: contact.phone,
  });

  return contact.toObject();
}

export async function listContacts(user: AuthUser, page = 1, limit = 20, search?: string) {
  const query: Record<string, unknown> = { tenantId: user.tenantId };
  const andClauses: Record<string, unknown>[] = [];

  if (user.role !== 'ADMIN') {
    andClauses.push({
      $or: [{ assignedUserId: user.userId }, { assignedUserId: { $exists: false } }],
    });
  }

  if (search) {
    const safeSearch = escapeRegExp(search);
    andClauses.push({
      $or: [
        { name: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
      ],
    });
  }

  if (andClauses.length > 0) {
    query.$and = andClauses;
  }

  const { skip, limit: lim } = getPagination({ page, limit });
  const contacts = await Contact.find(query).sort({ updatedAt: -1 }).skip(skip).limit(lim).lean();
  const total = await Contact.countDocuments(query);
  return paginatedResponse(contacts, total, page, lim);
}

function canUserAccessContact(user: AuthUser, contact: IContact): boolean {
  if (user.role === 'ADMIN') return true;
  return !contact.assignedUserId || contact.assignedUserId === user.userId;
}

function assertUserCanAccessContact(user: AuthUser, contact: IContact): void {
  if (!canUserAccessContact(user, contact)) {
    throw new AppError(403, 'Access denied to this contact');
  }
}

async function claimUnassignedConversation(
  user: AuthUser,
  conversation: IConversation & { save(): Promise<unknown> }
): Promise<void> {
  if (conversation.assignedUserId) return;

  conversation.assignedUserId = user.userId;
  await conversation.save();

  await logActivity(user, 'conversation.assigned', 'conversation', conversation._id.toString(), {
    assignedUserId: user.userId,
    selfAssigned: true,
  });
}

export async function openContactConversation(user: AuthUser, contactId: string) {
  const contact = await Contact.findOne({ _id: contactId, tenantId: user.tenantId });
  if (!contact) throw new AppError(404, 'Contact not found');

  if (!canUserAccessContact(user, contact)) {
    throw new AppError(403, 'Access denied to this contact');
  }

  let conversation = await Conversation.findOne({
    tenantId: user.tenantId,
    contactId: contact._id,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      tenantId: user.tenantId,
      whatsappAccountId: contact.whatsappAccountId,
      contactId: contact._id,
      status: 'OPEN',
      priority: 'NORMAL',
      unreadCount: 0,
      lastMessage: '',
      lastMessageAt: new Date(),
      ...(user.role === 'USER' ? { assignedUserId: user.userId } : {}),
    });
  } else if (user.role === 'USER') {
    if (
      conversation.assignedUserId &&
      conversation.assignedUserId !== user.userId &&
      !conversation.permittedUsers.includes(user.userId)
    ) {
      throw new AppError(403, 'This conversation is assigned to another user');
    }

    if (!conversation.assignedUserId) {
      await claimUnassignedConversation(user, conversation);
    }
  }

  return { conversationId: conversation._id.toString() };
}

export async function getContact(user: AuthUser, contactId: string) {
  const contact = await Contact.findOne({ _id: contactId, tenantId: user.tenantId });
  if (!contact) throw new AppError(404, 'Contact not found');
  assertUserCanAccessContact(user, contact);

  const [conversations, calls] = await Promise.all([
    Conversation.find({ tenantId: user.tenantId, contactId }).sort({ lastMessageAt: -1 }).limit(10),
    Call.find({ tenantId: user.tenantId, contactId }).sort({ createdAt: -1 }).limit(10),
  ]);

  return { contact, conversations, calls };
}

export async function updateContact(user: AuthUser, contactId: string, data: Partial<IContact>) {
  const existing = await Contact.findOne({ _id: contactId, tenantId: user.tenantId });
  if (!existing) throw new AppError(404, 'Contact not found');
  assertUserCanAccessContact(user, existing);

  const contact = await Contact.findOneAndUpdate(
    { _id: contactId, tenantId: user.tenantId },
    { name: data.name, tags: data.tags },
    { new: true }
  );
  if (!contact) throw new AppError(404, 'Contact not found');
  return contact;
}

export async function assignContact(user: AuthUser, contactId: string, assignedUserId: string) {
  const contact = await Contact.findOneAndUpdate(
    { _id: contactId, tenantId: user.tenantId },
    { assignedUserId },
    { new: true }
  );
  if (!contact) throw new AppError(404, 'Contact not found');
  return contact;
}

export async function deleteContact(user: AuthUser, contactId: string) {
  const contact = await Contact.findOne({ _id: contactId, tenantId: user.tenantId });
  if (!contact) throw new AppError(404, 'Contact not found');
  assertUserCanAccessContact(user, contact);

  const conversations = await Conversation.find({
    tenantId: user.tenantId,
    contactId: contact._id,
  }).select('_id');
  const conversationIds = conversations.map((conversation) => conversation._id);

  await Promise.all([
    Group.updateMany(
      { tenantId: user.tenantId, contactIds: contact._id },
      { $pull: { contactIds: contact._id } }
    ),
    Message.deleteMany({ tenantId: user.tenantId, contactId: contact._id }),
    InternalNote.deleteMany({ tenantId: user.tenantId, conversationId: { $in: conversationIds } }),
    Conversation.deleteMany({ tenantId: user.tenantId, contactId: contact._id }),
    Call.deleteMany({ tenantId: user.tenantId, contactId: contact._id }),
    Contact.deleteOne({ _id: contact._id }),
  ]);

  await logActivity(user, 'contact.deleted', 'contact', contactId, { name: contact.name });

  return { deleted: true };
}

export async function uploadContactAvatar(
  user: AuthUser,
  contactId: string,
  file: Express.Multer.File
) {
  const contact = await Contact.findOne({ _id: contactId, tenantId: user.tenantId });
  if (!contact) throw new AppError(404, 'Contact not found');

  const storageKey = await storeAvatar(
    user.tenantId,
    'contacts',
    contactId,
    file.originalname,
    file.buffer,
    file.mimetype
  );

  contact.profileImage = storageKey;
  await contact.save();

  return {
    profileImage: `/api/whatsapp/contacts/${contactId}/avatar`,
  };
}
