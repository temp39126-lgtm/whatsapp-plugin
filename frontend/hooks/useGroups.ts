'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CommunityDTO, GroupDTO } from '@/types';

export function useGroups(enabled = true) {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<GroupDTO[]>('/groups'),
    enabled,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; contactIds: string[] }) =>
      api.post<GroupDTO>('/groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useCommunities(enabled = true) {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => api.get<CommunityDTO[]>('/communities'),
    enabled,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; groupIds?: string[] }) =>
      api.post<CommunityDTO>('/communities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.delete(`/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUploadGroupAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, file }: { groupId: string; file: File }) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return api.upload<{ profileImage: string }>(`/groups/${groupId}/avatar`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });
}
