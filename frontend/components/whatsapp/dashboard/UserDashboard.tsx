'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Inbox,
  Phone,
  Users,
  Tags,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useConversations } from '@/hooks/useConversations';
import { StatCard } from './StatCard';
import { QuickAction } from './QuickAction';
import { getInitials } from '@/lib/utils';

export function UserDashboard() {
  const { user } = useAuth();

  const { data: myConversations, isLoading } = useConversations({ mine: true });
  const { data: openData } = useConversations({ mine: true, status: 'OPEN' });
  const { data: unreadData } = useConversations({ mine: true, unread: true });

  const conversations = myConversations?.data ?? [];
  const openCount = openData?.data?.length ?? 0;
  const unreadCount = unreadData?.data?.length ?? 0;
  const pendingCount = conversations.filter((c) => c.status === 'PENDING').length;
  const resolvedCount = conversations.filter((c) => c.status === 'RESOLVED').length;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-whatsapp-light/20 to-background">
      <div className="border-b bg-background/80 px-6 py-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-whatsapp-dark">User Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold">
              Hello, {user?.name ?? 'User'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your assigned conversations and tasks
            </p>
          </div>
          <Link
            href="/whatsapp/inbox"
            className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-medium text-white hover:bg-whatsapp-dark"
          >
            <Inbox className="h-4 w-4" />
            Go to Inbox
          </Link>
        </div>
      </div>

      <div className="space-y-8 p-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold">My Workload</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Assigned to Me"
              value={conversations.length}
              icon={MessageSquare}
              variant="whatsapp"
            />
            <StatCard
              label="Unread"
              value={unreadCount}
              icon={Inbox}
              variant={unreadCount > 0 ? 'warning' : 'default'}
            />
            <StatCard label="Open" value={openCount} icon={Clock} />
            <StatCard label="Resolved" value={resolvedCount} icon={CheckCircle2} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/whatsapp/inbox"
              label="My Inbox"
              description="Reply to customers"
              icon={Inbox}
            />
            <QuickAction
              href="/whatsapp/contacts"
              label="Contacts"
              description="View customer info"
              icon={Users}
            />
            <QuickAction
              href="/whatsapp/calls"
              label="Calls"
              description="Call history"
              icon={Phone}
            />
            <QuickAction
              href="/whatsapp/tags"
              label="Tags"
              description="Organize conversations"
              icon={Tags}
            />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Conversations</h2>
            <Link href="/whatsapp/inbox" className="text-sm text-whatsapp-dark hover:underline">
              View all
            </Link>
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            {conversations.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-whatsapp-light">
                  <Inbox className="h-8 w-8 text-whatsapp" />
                </div>
                <p className="font-medium">No conversations assigned yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  When an admin assigns conversations to you, they will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.slice(0, 8).map((conv) => {
                  const contact = conv.contact;
                  return (
                    <Link
                      key={conv._id}
                      href="/whatsapp/inbox"
                      className="flex items-center justify-between p-4 transition-colors hover:bg-whatsapp-light/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-whatsapp text-sm font-semibold text-white">
                            {getInitials(contact?.name ?? 'U')}
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{contact?.name ?? 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage ?? 'No messages'}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            conv.status === 'OPEN'
                              ? 'bg-green-100 text-green-700'
                              : conv.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {conv.status}
                        </span>
                        {conv.lastMessageAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {pendingCount > 0 && (
          <section className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-5">
            <div className="flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              <h2 className="font-semibold">
                {pendingCount} conversation{pendingCount !== 1 ? 's' : ''} pending follow-up
              </h2>
            </div>
            <p className="mt-1 text-sm text-yellow-700">
              Review pending conversations and update their status when resolved.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
