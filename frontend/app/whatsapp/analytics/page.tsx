'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AnalyticsConversations } from '@/types';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border p-3 sm:p-4">
      <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold sm:text-3xl">{value}</p>
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
        rejected: number;
        failed: number;
      }>('/analytics/calls'),
  });

  if (loadingConv) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full min-w-0 overflow-y-auto p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-semibold sm:mb-6 sm:text-2xl">Analytics</h1>

      <section className="mb-6 sm:mb-8">
        <h2 className="mb-3 text-base font-medium sm:mb-4 sm:text-lg">Conversations</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Total" value={conversations?.total ?? 0} />
          <StatCard label="Open" value={conversations?.open ?? 0} />
          <StatCard label="Pending" value={conversations?.pending ?? 0} />
          <StatCard label="Unread" value={conversations?.unread ?? 0} />
          <StatCard label="Resolved" value={conversations?.resolved ?? 0} />
          <StatCard label="Closed" value={conversations?.closed ?? 0} />
          <StatCard label="New Today" value={conversations?.newToday ?? 0} />
        </div>
      </section>

      <section className="mb-6 sm:mb-8">
        <h2 className="mb-3 text-base font-medium sm:mb-4 sm:text-lg">Calls</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Total" value={calls?.total ?? 0} />
          <StatCard label="Incoming" value={calls?.incoming ?? 0} />
          <StatCard label="Outgoing" value={calls?.outgoing ?? 0} />
          <StatCard label="Answered" value={calls?.answered ?? 0} />
          <StatCard label="Missed" value={calls?.missed ?? 0} />
          <StatCard label="Failed" value={calls?.failed ?? 0} />
          <StatCard label="Rejected" value={calls?.rejected ?? 0} />
        </div>
      </section>
    </div>
  );
}
