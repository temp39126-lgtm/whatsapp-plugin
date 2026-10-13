'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContactDTO } from '@/types';

export type CreateContactPayload = {
  name: string;
  phone: string;
  sendWelcomeWhatsAppTemplate?: boolean;
};

export type CreateContactResponse = ContactDTO & {
  welcomeTemplate?: { sent: boolean; error?: string };
};

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContactPayload) =>
      api.post<CreateContactResponse>('/contacts', payload),
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
