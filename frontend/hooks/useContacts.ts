'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContactDTO } from '@/types';

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; phone: string }) =>
      api.post<ContactDTO>('/contacts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => api.delete(`/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useOpenContactConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) =>
      api.post<{ conversationId: string }>(`/contacts/${contactId}/open-conversation`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUploadContactAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, file }: { contactId: string; file: File }) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return api.upload<{ profileImage: string }>(`/contacts/${contactId}/avatar`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });
}
