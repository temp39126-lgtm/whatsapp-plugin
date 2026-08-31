'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ConversationDTO, PaginatedResponse } from '@/types';

interface ConversationFilters {
  status?: string;
  assignedUserId?: string;
  unassigned?: boolean;
  unread?: boolean;
  priority?: string;
  search?: string;
  mine?: boolean;
}

export function useConversations(filters: ConversationFilters = {}) {
  return useQuery({
    queryKey: ['conversations', filters],
    queryFn: () =>
      api.get<PaginatedResponse<ConversationDTO>>('/conversations', filters as Record<string, string | number | boolean | undefined>),
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get<ConversationDTO>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedUserId }: { id: string; assignedUserId: string }) =>
      api.post(`/conversations/${id}/assign`, { assignedUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/conversations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/conversations/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
