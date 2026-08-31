'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function TeamPage() {
  const { data: workload, isLoading } = useQuery({
    queryKey: ['team-workload'],
    queryFn: () => api.get<Array<{ _id: string; open: number; pending: number; total: number }>>('/team/workload'),
  });

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Team Management</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Agent workload overview. Integrate with your SaaS team system for full user management.
          </p>
          {(workload ?? []).map((agent) => (
            <div key={agent._id} className="rounded-lg border p-4">
              <p className="font-medium">Agent: {agent._id}</p>
              <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                <span>Open: {agent.open}</span>
                <span>Pending: {agent.pending}</span>
                <span>Total: {agent.total}</span>
              </div>
            </div>
          ))}
          {(!workload || workload.length === 0) && (
            <p className="text-muted-foreground">No assigned agents yet</p>
          )}
        </div>
      )}
    </div>
  );
}
