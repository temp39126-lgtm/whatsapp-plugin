'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CallDTO, PaginatedResponse } from '@/types';

const PAGE_SIZE = 30;

export function useCallHistory() {
  return useInfiniteQuery({
    queryKey: ['calls'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<PaginatedResponse<CallDTO>>('/calls', { page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useDeleteCallFromHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) => api.delete(`/calls/${callId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useClearCallHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete<{ deleted: number }>('/calls/history'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
