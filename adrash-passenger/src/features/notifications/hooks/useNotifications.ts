import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { getPage } from '../../passenger-booking/services/apiEnvelope';
import type { NotificationDto } from '../../../api/types';

export const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useNotifications() {
    return useInfiniteQuery({
        queryKey: NOTIFICATIONS_KEY,
        queryFn: ({ pageParam = 1, signal }) =>
            getPage<NotificationDto>(
                ENDPOINTS.NOTIFICATIONS.LIST,
                { page: pageParam as number, pageSize: 20 },
                signal,
            ),
        initialPageParam: 1,
        getNextPageParam: (last) => {
            if (last.meta?.totalPages && last.meta.page && last.meta.page < last.meta.totalPages) {
                return last.meta.page + 1;
            }
            return undefined;
        },
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
    });
}

export function useUnreadCount() {
    const query = useNotifications();
    const all = query.data?.pages.flatMap((p) => p.items) ?? [];
    return all.filter((n) => !n.isRead).length;
}

export function useMarkNotificationRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id)),
        onSuccess: () => void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
    });
}

export function useMarkAllNotificationsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ),
        onSuccess: () => void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
    });
}
