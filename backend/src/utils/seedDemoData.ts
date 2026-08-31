import { Types } from 'mongoose';
import { Contact } from '../models/Contact';
import { Conversation } from '../models/Conversation';
import { InternalNote } from '../models/InternalNote';
import { Message } from '../models/Message';
import { Tag } from '../models/Tag';
import { logger } from '../config/logger';

type DemoMessage = {
  direction: 'INCOMING' | 'OUTGOING';
  text: string;
  minutesAgo: number;
  status?: 'SENT' | 'DELIVERED' | 'READ';
};

type DemoConversation = {
  contact: {
    name: string;
    phone: string;
    whatsappId: string;
  };
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  tagNames: string[];
  assignedToSupport: boolean;
  unreadCount: number;
  messages: DemoMessage[];
  note?: string;
};

const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    contact: { name: 'John Smith', phone: '+15551234567', whatsappId: '15551234567' },
    status: 'OPEN',
    priority: 'HIGH',
    tagNames: ['Order', 'Urgent'],
    assignedToSupport: true,
    unreadCount: 2,
    messages: [
      { direction: 'INCOMING', text: 'Hi, I placed order #4821 yesterday but still no shipping update.', minutesAgo: 240 },
      { direction: 'OUTGOING', text: 'Hello John! Let me check that for you right away.', minutesAgo: 230, status: 'READ' },
      { direction: 'INCOMING', text: 'Thanks. I need it before Friday if possible.', minutesAgo: 220 },
      { direction: 'INCOMING', text: 'Can you confirm the delivery address on file?', minutesAgo: 215 },
    ],
    note: 'Customer is a repeat buyer — prioritize shipping update.',
  },
  {
    contact: { name: 'Sarah Johnson', phone: '+15559876543', whatsappId: '15559876543' },
    status: 'PENDING',
    priority: 'NORMAL',
    tagNames: ['Refund'],
    assignedToSupport: true,
    unreadCount: 1,
    messages: [
      { direction: 'INCOMING', text: 'I received the wrong color. Can I get a refund?', minutesAgo: 180 },
      { direction: 'OUTGOING', text: 'Sorry about that, Sarah. Can you share a photo of the item?', minutesAgo: 170, status: 'READ' },
      { direction: 'INCOMING', text: 'Sure, sending it now.', minutesAgo: 165 },
    ],
  },
  {
    contact: { name: 'Mike Wilson', phone: '+15555555555', whatsappId: '15555555555' },
    status: 'OPEN',
    priority: 'NORMAL',
    tagNames: ['New Customer', 'Lead'],
    assignedToSupport: true,
    unreadCount: 0,
    messages: [
      { direction: 'INCOMING', text: 'Do you ship to Canada?', minutesAgo: 120 },
      { direction: 'OUTGOING', text: 'Yes! We ship to Canada in 5–7 business days.', minutesAgo: 110, status: 'READ' },
      { direction: 'INCOMING', text: 'Perfect. What are your bulk pricing tiers?', minutesAgo: 100 },
      { direction: 'OUTGOING', text: 'I can send our wholesale sheet — how many units are you looking at?', minutesAgo: 95, status: 'DELIVERED' },
    ],
  },
  {
    contact: { name: 'Emma Davis', phone: '+15554443322', whatsappId: '15554443322' },
    status: 'OPEN',
    priority: 'URGENT',
    tagNames: ['Payment', 'Urgent'],
    assignedToSupport: true,
    unreadCount: 1,
    messages: [
      { direction: 'INCOMING', text: 'My card was charged twice for the same order.', minutesAgo: 90 },
      { direction: 'OUTGOING', text: 'That sounds frustrating — I can help fix this. What is the order number?', minutesAgo: 85, status: 'READ' },
      { direction: 'INCOMING', text: 'Order #5102. Please refund the duplicate charge today.', minutesAgo: 80 },
    ],
  },
  {
    contact: { name: 'Carlos Rivera', phone: '+15553332211', whatsappId: '15553332211' },
    status: 'OPEN',
    priority: 'HIGH',
    tagNames: ['VIP', 'Order'],
    assignedToSupport: true,
    unreadCount: 0,
    messages: [
      { direction: 'INCOMING', text: 'Good morning — can you reserve 50 units from the new collection?', minutesAgo: 70 },
      { direction: 'OUTGOING', text: 'Good morning Carlos! I will hold those for you now.', minutesAgo: 65, status: 'READ' },
      { direction: 'INCOMING', text: 'Please send the invoice to billing@rivera-co.com', minutesAgo: 60 },
    ],
  },
  {
    contact: { name: 'Priya Patel', phone: '+15552221100', whatsappId: '15552221100' },
    status: 'PENDING',
    priority: 'HIGH',
    tagNames: ['Complaint'],
    assignedToSupport: false,
    unreadCount: 3,
    messages: [
      { direction: 'INCOMING', text: 'This is the third time my package arrived damaged.', minutesAgo: 55 },
      { direction: 'INCOMING', text: 'I want to speak with a manager.', minutesAgo: 50 },
      { direction: 'INCOMING', text: 'Please respond ASAP.', minutesAgo: 45 },
    ],
    note: 'Escalated complaint — admin should assign to an agent.',
  },
  {
    contact: { name: 'James Brown', phone: '+15551110099', whatsappId: '15551110099' },
    status: 'RESOLVED',
    priority: 'NORMAL',
    tagNames: ['Order'],
    assignedToSupport: true,
    unreadCount: 0,
    messages: [
      { direction: 'INCOMING', text: 'Tracking says delivered but I did not receive it.', minutesAgo: 1440 },
      { direction: 'OUTGOING', text: 'I opened a carrier investigation for you.', minutesAgo: 1430, status: 'READ' },
      { direction: 'INCOMING', text: 'Found it with a neighbor — all good now, thanks!', minutesAgo: 720 },
      { direction: 'OUTGOING', text: 'Great to hear! Closing this ticket for you.', minutesAgo: 715, status: 'READ' },
    ],
  },
  {
    contact: { name: 'Lisa Chen', phone: '+15550001122', whatsappId: '15550001122' },
    status: 'CLOSED',
    priority: 'LOW',
    tagNames: ['Lead'],
    assignedToSupport: true,
    unreadCount: 0,
    messages: [
      { direction: 'INCOMING', text: 'Interested in your spring catalog.', minutesAgo: 2880 },
      { direction: 'OUTGOING', text: 'Happy to help! Here is the link to our latest catalog.', minutesAgo: 2870, status: 'READ' },
      { direction: 'INCOMING', text: 'Thanks, we will review internally and get back to you.', minutesAgo: 1440 },
    ],
  },
];

export async function clearDemoCrmData(tenantId: string): Promise<void> {
  await Promise.all([
    Message.deleteMany({ tenantId }),
    InternalNote.deleteMany({ tenantId }),
    Conversation.deleteMany({ tenantId }),
    Contact.deleteMany({ tenantId }),
  ]);
  logger.info('Cleared existing demo CRM data');
}

export async function seedDemoCrmData(options: {
  tenantId: string;
  whatsappAccountId: Types.ObjectId;
  supportUserId: string;
  adminUserId: string;
}): Promise<void> {
  const { tenantId, whatsappAccountId, supportUserId, adminUserId } = options;
  const tags = await Tag.find({ tenantId }).lean();
  const tagByName = new Map(tags.map((tag) => [tag.name, tag._id]));

  for (const demo of DEMO_CONVERSATIONS) {
    const contact = await Contact.create({
      tenantId,
      whatsappAccountId,
      name: demo.contact.name,
      phone: demo.contact.phone,
      whatsappId: demo.contact.whatsappId,
      tags: demo.tagNames.map((name) => tagByName.get(name)).filter(Boolean),
      assignedUserId: demo.assignedToSupport ? supportUserId : undefined,
    });

    const lastMessage = demo.messages[demo.messages.length - 1];
    const lastMessageAt = new Date(Date.now() - lastMessage.minutesAgo * 60_000);

    const conversation = await Conversation.create({
      tenantId,
      whatsappAccountId,
      contactId: contact._id,
      assignedUserId: demo.assignedToSupport ? supportUserId : undefined,
      permittedUsers: demo.assignedToSupport ? [] : [adminUserId],
      status: demo.status,
      priority: demo.priority,
      tags: demo.tagNames.map((name) => tagByName.get(name)).filter(Boolean),
      unreadCount: demo.unreadCount,
      lastMessage: lastMessage.text,
      lastMessageAt,
    });

    await Message.insertMany(
      demo.messages.map((message, messageIndex) => ({
        tenantId,
        conversationId: conversation._id,
        contactId: contact._id,
        metaMessageId: `demo-${contact.whatsappId}-${messageIndex}`,
        direction: message.direction,
        type: 'TEXT',
        content: { text: message.text },
        status: message.status ?? (message.direction === 'OUTGOING' ? 'READ' : 'DELIVERED'),
        sentByUserId: message.direction === 'OUTGOING' ? supportUserId : undefined,
        createdAt: new Date(Date.now() - message.minutesAgo * 60_000),
      }))
    );

    if (demo.note) {
      await InternalNote.create({
        tenantId,
        conversationId: conversation._id,
        content: demo.note,
        createdBy: demo.assignedToSupport ? supportUserId : adminUserId,
      });
    }
  }

  logger.info(
    {
      contacts: DEMO_CONVERSATIONS.length,
      conversations: DEMO_CONVERSATIONS.length,
    },
    'Demo CRM data seeded successfully'
  );
}
