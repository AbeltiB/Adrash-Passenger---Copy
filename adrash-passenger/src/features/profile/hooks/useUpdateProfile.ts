// src/features/profile/hooks/useUpdateProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type { ApiResponse, UserDto, UpdateMeCommand } from '../../../api/types';
import { PROFILE_QUERY_KEY } from './useProfile';

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation<UserDto, Error, UpdateMeCommand>({
        mutationFn: async (body) => {
            const res = await apiClient.patch<ApiResponse<UserDto>>(
                ENDPOINTS.USERS.ME,
                body,
            );
            if (!res.data.success || !res.data.data) {
                throw new Error(res.data.errors?.[0] ?? 'Update failed');
            }
            return res.data.data;
        },
        onSuccess: (updated) => {
            // Immediately update the cached profile so the UI reflects changes
            queryClient.setQueryData<UserDto>(PROFILE_QUERY_KEY, updated);
        },
    });
}