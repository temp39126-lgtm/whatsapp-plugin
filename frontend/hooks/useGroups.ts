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
