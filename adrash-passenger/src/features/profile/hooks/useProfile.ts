// src/features/profile/hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type { ApiResponse, UserDto } from '../../../api/types';

export const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

export function useProfile() {
    return useQuery<UserDto>({
        queryKey: PROFILE_QUERY_KEY,
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<UserDto>>(ENDPOINTS.USERS.ME);
            if (!res.data.success || !res.data.data) {
                throw new Error(res.data.errors?.[0] ?? 'Failed to load profile');
            }
            return res.data.data;
        },
        staleTime: 5 * 60 * 1000,   // 5 min — profile changes infrequently
    });
}