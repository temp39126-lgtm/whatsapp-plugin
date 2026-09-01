'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuthUser } from '@/types';

export function useUpdateProfile(onSuccess?: (user: AuthUser) => void) {
  return useMutation({
    mutationFn: (name: string) => api.put<AuthUser>('/profile', { name }),
    onSuccess,
  });
}

export function useUploadProfileAvatar(onSuccess?: (user: AuthUser) => void) {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return api.upload<AuthUser>('/profile/avatar', formData);
    },
    onSuccess,
  });
}
