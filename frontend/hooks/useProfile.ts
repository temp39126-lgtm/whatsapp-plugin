'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuthUser, UserPreferences, UserProfile } from '@/types';

export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.get<UserProfile>('/profile'),
  });
}

export function useUpdateProfile(onSuccess?: (user: UserProfile) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name?: string; about?: string }) =>
      api.put<UserProfile>('/profile', payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(['user-profile'], profile);
      onSuccess?.(profile);
    },
  });
}

export function useUpdatePreferences(onSuccess?: (user: UserProfile) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: {
      notifications?: Partial<UserPreferences['notifications']>;
      privacy?: Partial<UserPreferences['privacy']>;
    }) => api.put<UserProfile>('/profile/preferences', preferences),
    onSuccess: (profile) => {
      queryClient.setQueryData(['user-profile'], profile);
      onSuccess?.(profile);
    },
  });
}

export function useUploadProfileAvatar(onSuccess?: (user: UserProfile) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return api.upload<UserProfile>('/profile/avatar', formData);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['user-profile'], profile);
      onSuccess?.(profile);
    },
  });
}

export function profileToAuthUser(profile: UserProfile): AuthUser {
  return {
    userId: profile.userId,
    tenantId: profile.tenantId,
    role: profile.role,
    permissions: profile.permissions,
    email: profile.email,
    name: profile.name,
    profileImage: profile.profileImage,
  };
}
