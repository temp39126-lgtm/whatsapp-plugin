'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDeleteTeamUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete<{ deleted: boolean }>(`/team/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
