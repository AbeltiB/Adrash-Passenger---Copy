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

    return useMutation<
        NotificationPreferenceDto[],
        Error,
        NotificationPreferenceDto[],
        { previous: NotificationPreferenceDto[] | undefined }
    >({
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
        // Flip the switch immediately rather than waiting on the network...
        onMutate: async (next) => {
            await queryClient.cancelQueries({ queryKey: NOTIF_PREFS_KEY });
            const previous = queryClient.getQueryData<NotificationPreferenceDto[]>(NOTIF_PREFS_KEY);
            queryClient.setQueryData<NotificationPreferenceDto[]>(NOTIF_PREFS_KEY, next);
            return { previous };
        },
        // ...and snap it back if the PATCH actually failed.
        onError: (_err, _next, context) => {
            if (context?.previous) {
                queryClient.setQueryData<NotificationPreferenceDto[]>(NOTIF_PREFS_KEY, context.previous);
            }
        },
        onSuccess: (updated) => {
            queryClient.setQueryData<NotificationPreferenceDto[]>(NOTIF_PREFS_KEY, updated);
        },
    });
}