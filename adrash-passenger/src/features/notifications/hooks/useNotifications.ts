import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { getPage } from '../../passenger-booking/services/apiEnvelope';
import type { NotificationDto } from '../../../api/types';

export const NOTIFICATIONS_KEY = ['notifications'] as const;

// Backend NotificationDto is { id, type, title, body, isRead, metadataJson?, createdAt }.
// The app reads `eventType` (icon) and `deepLink` (navigation), so map the API's
// `type` → eventType and pull a deepLink out of metadataJson when present.
function mapNotification(raw: unknown): NotificationDto {
    const r = (raw ?? {}) as Record<string, unknown>;
    let deepLink: string | null = typeof r.deepLink === 'string' ? r.deepLink : null;
    if (!deepLink && typeof r.metadataJson === 'string') {
        try {
            const meta = JSON.parse(r.metadataJson) as { deepLink?: string; url?: string } | null;
            deepLink = meta?.deepLink ?? meta?.url ?? null;
        } catch {
            deepLink = null;
        }
    }
    return {
        id: String(r.id ?? ''),
        title: typeof r.title === 'string' ? r.title : '',
        body: typeof r.body === 'string' ? r.body : '',
        eventType: (r.eventType ?? r.type ?? null) as NotificationDto['eventType'],
        isRead: Boolean(r.isRead),
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
        deepLink,
    };
}

export function useNotifications() {
    return useInfiniteQuery({
        queryKey: NOTIFICATIONS_KEY,
        queryFn: ({ pageParam = 1, signal }) =>
            getPage<unknown>(
                ENDPOINTS.NOTIFICATIONS.LIST,
                { page: pageParam as number, pageSize: 20 },
                signal,
            ).then((p) => ({ ...p, items: p.items.map(mapNotification) })),
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
