// src/features/profile/hooks/useNotificationPreferences.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type { ApiResponse, NotificationPreferenceDto } from '../../../api/types';

export const NOTIF_PREFS_KEY = ['notifications', 'preferences'] as const;

export function useNotificationPreferences() {
    return useQuery<NotificationPreferenceDto[]>({
        queryKey: NOTIF_PREFS_KEY,
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<NotificationPreferenceDto[]>>(
                ENDPOINTS.NOTIFICATIONS.PREFERENCES,
            );
            if (!res.data.success) {
                throw new Error(res.data.errors?.[0] ?? 'Failed to load preferences');
            }
            return res.data.data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateNotificationPreferences() {
    const queryClient = useQueryClient();

    return useMutation<NotificationPreferenceDto[], Error, NotificationPreferenceDto[]>({
        mutationFn: async (prefs) => {
            const res = await apiClient.patch<ApiResponse<NotificationPreferenceDto[]>>(
                ENDPOINTS.NOTIFICATIONS.PREFERENCES,
                prefs,
            );
            if (!res.data.success) {
                throw new Error(res.data.errors?.[0] ?? 'Failed to update preferences');
            }
            return res.data.data ?? [];
        },
        onSuccess: (updated) => {
            queryClient.setQueryData<NotificationPreferenceDto[]>(NOTIF_PREFS_KEY, updated);
        },
    });
}