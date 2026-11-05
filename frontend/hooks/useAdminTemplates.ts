'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AdminWhatsAppTemplate = {
  id: string;
  name: string;
  language: string;
  category?: string;
  status: string;
  components: Array<Record<string, unknown>>;
  rejectedReason?: string;
  bodyPreview?: string;
};

export type TemplateFormInput = {
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  bodyText: string;
  headerText?: string;
  footerText?: string;
  buttons?: Array<
    | { type: 'QUICK_REPLY'; text: string }
    | { type: 'URL'; text: string; url: string }
  >;
};

export function useAdminTemplates() {
  return useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => api.get<{ data: AdminWhatsAppTemplate[] }>('/templates'),
  });
}

export function useCreateAdminTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TemplateFormInput) =>
      api.post<AdminWhatsAppTemplate>('/templates', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
  });
}

export function useUpdateAdminTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<TemplateFormInput, 'name' | 'language'> & { category?: TemplateFormInput['category'] } }) =>
      api.put<AdminWhatsAppTemplate>(`/templates/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
  });
}

export function useDeleteAdminTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, language }: { id: string; name: string; language: string }) =>
      api.request<void>(`/templates/${id}`, {
        method: 'DELETE',
        params: { name, language },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
  });
}
