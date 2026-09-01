import { AuthUser } from '../../types';
import { Contact, IContact } from '../../models/Contact';
import { Conversation } from '../../models/Conversation';
import { Call } from '../../models/Call';
import { Group } from '../../models/Group';
import { Message } from '../../models/Message';
import { InternalNote } from '../../models/InternalNote';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { AppError } from '../../types';
import { logActivity } from '../rbac/activityLog';
import { storeAvatar } from '../avatars/avatarService';
import { WhatsAppAccount } from '../../models/WhatsAppAccount';

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

  const contact = await Contact.create({
    tenantId: user.tenantId,
    whatsappAccountId: account._id,
    name: input.name.trim(),
    phone,
    whatsappId,
    tags: [],
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
  });

  await logActivity(user, 'contact.created', 'contact', contact._id.toString(), {
    name: contact.name,
    phone: contact.phone,
  });

  return contact.toObject();
}

export async function listContacts(user: AuthUser, page = 1, limit = 20, search?: string) {
  const query: Record<string, unknown> = { tenantId: user.tenantId };

  if (user.role !== 'ADMIN') {
    query.$or = [{ assignedUserId: user.userId }, { assignedUserId: { $exists: false } }];
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const { skip, limit: lim } = getPagination({ page, limit });
  const contacts = await Contact.find(query).sort({ updatedAt: -1 }).skip(skip).limit(lim).lean();
  const total = await Contact.countDocuments(query);
  return paginatedResponse(contacts, total, page, lim);
}

export async function getContact(user: AuthUser, contactId: string) {
  const contact = await Contact.findOne({ _id: contactId, tenantId: user.tenantId });
  if (!contact) throw new AppError(404, 'Contact not found');

  const [conversations, calls] = await Promise.all([
    Conversation.find({ tenantId: user.tenantId, contactId }).sort({ lastMessageAt: -1 }).limit(10),
    Call.find({ tenantId: user.tenantId, contactId }).sort({ createdAt: -1 }).limit(10),
  ]);

  return { contact, conversations, calls };
}

export async function updateContact(user: AuthUser, contactId: string, data: Partial<IContact>) {
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
