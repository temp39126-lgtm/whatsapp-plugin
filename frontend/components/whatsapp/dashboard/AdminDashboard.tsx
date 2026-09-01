'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  Inbox,
  UserCog,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useConversations } from '@/hooks/useConversations';
import { StatCard } from './StatCard';
import { QuickAction } from './QuickAction';
import { ProfileAvatar } from '@/components/whatsapp/shared/ProfileAvatar';
import { buildInboxHref } from '@/lib/inbox-filters';
import type { AnalyticsConversations, TeamAgentWorkloadDTO } from '@/types';
import { getInitials } from '@/lib/utils';

export function AdminDashboard() {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-conversations'],
    queryFn: () => api.get<AnalyticsConversations>('/analytics/conversations'),
  });

  const { data: teamWorkload } = useQuery({
    queryKey: ['team-workload'],
    queryFn: () => api.get<TeamAgentWorkloadDTO[]>('/team/workload'),
  });

  const { data: unassignedData } = useConversations({ unassigned: true });
  const { data: recentData } = useConversations({ limit: 5 });

  const unassigned = unassignedData?.data ?? [];
  const recent = recentData?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-whatsapp-light/30 via-background to-background">
      <div className="border-b bg-background/80 px-6 py-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-whatsapp-dark">Admin Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold">
              Welcome back, {user?.name ?? 'Admin'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Overview of your WhatsApp CRM tenant
            </p>
          </div>
          <Link
            href="/whatsapp/inbox"
            className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-4 py-2.5 text-sm font-medium text-white hover:bg-whatsapp-dark"
          >
            <Inbox className="h-4 w-4" />
            Open Inbox
          </Link>
        </div>
      </div>

      <div className="space-y-8 p-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Conversations"
              value={analytics?.total ?? 0}
              icon={MessageSquare}
              variant="whatsapp"
              href={buildInboxHref()}
            />
            <StatCard
              label="Assigned"
              value={analytics?.assigned ?? 0}
              icon={UserCheck}
              trend={`${analytics?.unread ?? 0} unread`}
              href={buildInboxHref({ assigned: true })}
            />
            <StatCard
              label="Unassigned"
              value={unassigned.length}
              icon={AlertCircle}
              variant="warning"
              href={buildInboxHref({ unassigned: true })}
            />
            <StatCard
              label="New Today"
              value={analytics?.newToday ?? 0}
              icon={BarChart3}
              href={buildInboxHref({ newToday: true })}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Status Breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Pending"
              value={analytics?.pending ?? 0}
              variant="muted"
              href={buildInboxHref({ status: 'PENDING' })}
            />
            <StatCard
              label="Resolved"
              value={analytics?.resolved ?? 0}
              variant="muted"
              href={buildInboxHref({ status: 'RESOLVED' })}
            />
            <StatCard
              label="Closed"
              value={analytics?.closed ?? 0}
              variant="muted"
              href={buildInboxHref({ status: 'CLOSED' })}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickAction
                href="/whatsapp/inbox"
                label="Team Inbox"
                description="View all conversations"
                icon={Inbox}
              />
              <QuickAction
                href="/whatsapp/analytics"
                label="Analytics"
                description="Reports and metrics"
                icon={BarChart3}
              />
              <QuickAction
                href="/whatsapp/team"
                label="Team"
                description="Create agent accounts"
                icon={UserCog}
              />
              <QuickAction
                href="/whatsapp/settings"
                label="Settings"
                description="WhatsApp configuration"
                icon={Settings}
              />
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Users</h2>
                <p className="text-xs text-muted-foreground">
                  Agents only — click to view profile and assigned conversations
                </p>
              </div>
              <Link href="/whatsapp/team" className="text-sm text-whatsapp-dark hover:underline">
                Add agent
              </Link>
            </div>
            <div className="rounded-xl border bg-card shadow-sm">
              {(teamWorkload ?? []).length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No agents yet</p>
              ) : (
                <div className="divide-y">
                  {(teamWorkload ?? []).map((agent) => (
                    <Link
                      key={agent._id}
                      href={`/whatsapp/team/${agent._id}`}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ProfileAvatar
                          name={agent.name}
                          imageUrl={agent.profileImage}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{agent.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{agent.email}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{agent.total}</span> assigned
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Conversations</h2>
            <Link href="/whatsapp/inbox" className="text-sm text-whatsapp-dark hover:underline">
              View inbox
            </Link>
          </div>
          <div className="rounded-xl border bg-card shadow-sm">
            {recent.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No conversations yet</p>
            ) : (
              <div className="divide-y">
                {recent.map((conv) => {
                  const contact = conv.contact;
                  return (
                    <Link
                      key={conv._id}
                      href={buildInboxHref({}, conv._id)}
                      className="flex items-center justify-between p-4 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-whatsapp text-sm font-semibold text-white">
                          {getInitials(contact?.name ?? 'U')}
                        </div>
                        <div>
                          <p className="font-medium">{contact?.name ?? 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {conv.lastMessage ?? 'No messages'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            conv.status === 'OPEN'
                              ? 'bg-green-100 text-green-700'
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

        {unassigned.length > 0 && (
          <section className="rounded-xl border border-orange-200 bg-orange-50/50 p-5">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <h2 className="font-semibold">
                {unassigned.length} unassigned conversation{unassigned.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <p className="mt-1 text-sm text-orange-700">
              Assign agents from the inbox to improve response times.
            </p>
            <Link
              href={buildInboxHref({ unassigned: true })}
              className="mt-3 inline-block text-sm font-medium text-orange-800 underline"
            >
              Go to inbox →
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
