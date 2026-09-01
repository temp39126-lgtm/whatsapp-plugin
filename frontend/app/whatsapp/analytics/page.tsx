'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AgentAnalyticsDTO, AnalyticsConversations } from '@/types';
import { getInitials } from '@/lib/utils';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: conversations, isLoading: loadingConv } = useQuery({
    queryKey: ['analytics-conversations'],
    queryFn: () => api.get<AnalyticsConversations>('/analytics/conversations'),
  });

  const { data: calls } = useQuery({
    queryKey: ['analytics-calls'],
    queryFn: () =>
      api.get<{
        total: number;
        incoming: number;
        outgoing: number;
        answered: number;
        missed: number;
      }>('/analytics/calls'),
  });

  const { data: agents } = useQuery({
    queryKey: ['analytics-agents'],
    queryFn: () => api.get<AgentAnalyticsDTO[]>('/analytics/agents'),
  });

  if (loadingConv) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold">Analytics</h1>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium">Conversations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={conversations?.total ?? 0} />
          <StatCard label="Open" value={conversations?.open ?? 0} />
          <StatCard label="Pending" value={conversations?.pending ?? 0} />
          <StatCard label="Unread" value={conversations?.unread ?? 0} />
          <StatCard label="Resolved" value={conversations?.resolved ?? 0} />
          <StatCard label="Closed" value={conversations?.closed ?? 0} />
          <StatCard label="New Today" value={conversations?.newToday ?? 0} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium">Calls</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={calls?.total ?? 0} />
          <StatCard label="Incoming" value={calls?.incoming ?? 0} />
          <StatCard label="Outgoing" value={calls?.outgoing ?? 0} />
          <StatCard label="Answered" value={calls?.answered ?? 0} />
          <StatCard label="Missed" value={calls?.missed ?? 0} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Agent Workload</h2>
        <div className="space-y-2">
          {(agents ?? []).map((agent) => (
            <div key={agent._id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-whatsapp text-xs font-semibold text-white">
                  {getInitials(agent.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{agent.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{agent.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-4 text-sm text-muted-foreground">
                <span>Total: {agent.total}</span>
                <span>Open: {agent.open}</span>
                <span>Resolved: {agent.resolved}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
