import { AuthUser } from '../../types';
import { Contact, IContact } from '../../models/Contact';
import { Conversation } from '../../models/Conversation';
import { Call } from '../../models/Call';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { AppError } from '../../types';

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
