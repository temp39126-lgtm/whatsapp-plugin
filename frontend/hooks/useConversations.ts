'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ConversationDTO, PaginatedResponse, TagDTO, TeamUserDTO } from '@/types';

interface ConversationFilters {
  status?: string;
  assignedUserId?: string;
  unassigned?: boolean;
  assigned?: boolean;
  newToday?: boolean;
  unread?: boolean;
  priority?: string;
  search?: string;
  mine?: boolean;
  groups?: boolean;
  assignedByAdmin?: boolean;
  page?: number;
  limit?: number;
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

export function useTeamUsers(enabled = true) {
  return useQuery({
    queryKey: ['team-users'],
    queryFn: () => api.get<TeamUserDTO[]>('/team/users'),
    enabled,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<TagDTO[]>('/tags'),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<TagDTO>('/tags', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });
}

function invalidateConversationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId?: string
) {
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
  if (conversationId) {
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
  }
}

export function useAssignConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      assignedUserId,
      version,
    }: {
      id: string;
      assignedUserId: string | null;
      version?: number;
    }) => api.post(`/conversations/${id}/assign`, { assignedUserId, version }),
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(queryClient, variables.id);
    },
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, version }: { id: string; status: string; version?: number }) =>
      api.put(`/conversations/${id}/status`, { status, version }),
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(queryClient, variables.id);
    },
  });
}

export function useUpdateConversationPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority, version }: { id: string; priority: string; version?: number }) =>
      api.put(`/conversations/${id}/priority`, { priority, version }),
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(queryClient, variables.id);
    },
  });
}

export function useUpdateConversationTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tagIds, version }: { id: string; tagIds: string[]; version?: number }) =>
      api.put(`/conversations/${id}/tags`, { tagIds, version }),
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(queryClient, variables.id);
    },
  });
}

export function useUpdatePermittedUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userIds, version }: { id: string; userIds: string[]; version?: number }) =>
      api.put(`/conversations/${id}/permitted-users`, { userIds, version }),
    onSuccess: (_data, variables) => {
      invalidateConversationQueries(queryClient, variables.id);
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/conversations/${id}/read`),
    onSuccess: (_data, id) => {
      invalidateConversationQueries(queryClient, id);
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ markedCount: number }>('/conversations/read-all'),
    onSuccess: () => {
      invalidateConversationQueries(queryClient);
    },
  });
}
