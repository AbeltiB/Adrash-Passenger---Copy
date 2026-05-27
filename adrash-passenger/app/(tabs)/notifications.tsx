// app/(tabs)/notifications.tsx
// Notifications screen — real API data, mark-read on tap, mark-all-read button.
// APIs: GET /notifications (paginated), PATCH /notifications/{id}/read,
//       PATCH /notifications/read-all

import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from '../../src/features/notifications/hooks/useNotifications';
import type { NotificationDto, NotificationEventType } from '../../src/api/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eventIcon(type: NotificationEventType | null): string {
    switch (type) {
        case 'BookingConfirmed':  return '🎫';
        case 'DriverAssigned':    return '🚌';
        case 'BusEnRoute':        return '📍';
        case 'ArrivedAtPickup':   return '🏁';
        case 'TripStarted':       return '▶️';
        case 'TripCompleted':     return '✅';
        case 'RefundProcessed':   return '💰';
        case 'PointsEarned':      return '⭐';
        case 'Promotional':       return '📣';
        default:                  return 'ℹ️';
    }
}

function relativeTime(iso: string): string {
    const diffMs  = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1)   return 'Just now';
    if (diffMin < 60)  return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr  < 24)  return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7)   return `${diffDay}d ago`;
    return new Date(iso).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' });
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotificationItem({
    item,
    onPress,
}: {
    item: NotificationDto;
    onPress: (n: NotificationDto) => void;
}) {
    return (
        <Pressable
            style={[styles.item, !item.isRead && styles.itemUnread]}
            onPress={() => onPress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
        >
            <View style={styles.iconBox}>
                <Text style={styles.icon}>{eventIcon(item.eventType)}</Text>
            </View>
            <View style={styles.itemBody}>
                <View style={styles.itemHead}>
                    <Text
                        style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    {!item.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.itemText} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.itemTime}>{relativeTime(item.createdAt)}</Text>
            </View>
        </Pressable>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
    const { t } = useTranslation();
    const query       = useNotifications();
    const markRead    = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const notifications = query.data?.pages.flatMap((p) => p.items) ?? [];
    const hasUnread     = notifications.some((n) => !n.isRead);

    function handleTap(n: NotificationDto) {
        if (!n.isRead) {
            markRead.mutate(n.id);
        }
        if (n.deepLink) {
            // deep links are safe internal routes, e.g. "/(tabs)/trip/{id}/index"
            router.push(n.deepLink as Parameters<typeof router.push>[0]);
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    style={styles.backBtn}
                >
                    <Text style={styles.back}>←</Text>
                </Pressable>
                <Text style={styles.title}>{t('notifications.title')}</Text>
                <Pressable
                    onPress={() => markAllRead.mutate()}
                    disabled={!hasUnread || markAllRead.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={t('notifications.mark_all_read')}
                >
                    {markAllRead.isPending ? (
                        <ActivityIndicator size="small" color={Colors.brand.primary} />
                    ) : (
                        <Text style={[styles.markAll, !hasUnread && styles.markAllDisabled]}>
                            {t('notifications.mark_all_read')}
                        </Text>
                    )}
                </Pressable>
            </View>

            {/* ── Content ── */}
            <ScrollView
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={query.isRefetching}
                        onRefresh={() => void query.refetch()}
                    />
                }
            >
                {query.isLoading ? (
                    <View style={styles.centred}>
                        <ActivityIndicator size="large" color={Colors.brand.primary} />
                    </View>
                ) : query.isError ? (
                    <View style={styles.centred}>
                        <Text style={styles.emptyIcon}>⚠️</Text>
                        <Text style={styles.emptyText}>{t('notifications.could_not_load')}</Text>
                        <Pressable onPress={() => void query.refetch()} style={styles.retryBtn}>
                            <Text style={styles.retryText}>{t('common.retry')}</Text>
                        </Pressable>
                    </View>
                ) : notifications.length === 0 ? (
                    <View style={styles.centred}>
                        <Text style={styles.emptyIcon}>✓</Text>
                        <Text style={styles.emptyText}>{t('notifications.all_caught_up')}</Text>
                        <Text style={styles.emptySubText}>{t('notifications.empty_sub')}</Text>
                    </View>
                ) : (
                    <>
                        {notifications.map((n) => (
                            <NotificationItem key={n.id} item={n} onPress={handleTap} />
                        ))}

                        {query.hasNextPage && (
                            <Pressable
                                style={styles.loadMore}
                                onPress={() => void query.fetchNextPage()}
                                disabled={query.isFetchingNextPage}
                            >
                                {query.isFetchingNextPage ? (
                                    <ActivityIndicator color={Colors.brand.primary} />
                                ) : (
                                    <Text style={styles.loadMoreText}>{t('trips.load_more')}</Text>
                                )}
                            </Pressable>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    backBtn: { padding: 4 },
    back:    { fontSize: 24, color: Colors.text.primary, fontWeight: '600' },
    title:   { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
    markAll: { color: Colors.brand.primary, fontWeight: '700', fontSize: 13 },
    markAllDisabled: { color: Colors.text.disabled },

    list:    { padding: Spacing.lg, gap: Spacing.sm },

    item: {
        flexDirection: 'row',
        gap: Spacing.md,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadow.sm,
    },
    itemUnread: { backgroundColor: Colors.brand.primaryTint },

    iconBox: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.background.secondary,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    icon: { fontSize: 22 },

    itemBody: { flex: 1, gap: 2 },
    itemHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itemTitle: {
        flex: 1, fontSize: 14, fontWeight: '500',
        color: Colors.text.secondary,
    },
    itemTitleUnread: { fontWeight: '700', color: Colors.text.primary },
    unreadDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: Colors.brand.primary, flexShrink: 0,
    },
    itemText: { color: Colors.text.secondary, fontSize: 13 },
    itemTime: { color: Colors.text.tertiary, fontSize: 11, marginTop: 2 },

    centred:      { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['4xl'], gap: Spacing.md },
    emptyIcon:    { fontSize: 44 },
    emptyText:    { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
    emptySubText: { color: Colors.text.tertiary, fontSize: 13 },
    retryBtn: {
        backgroundColor: Colors.brand.primary,
        paddingHorizontal: Spacing.xl, paddingVertical: 10,
        borderRadius: BorderRadius.lg, marginTop: Spacing.sm,
    },
    retryText: { color: '#fff', fontWeight: '700' },

    loadMore:     { alignItems: 'center', padding: Spacing.lg },
    loadMoreText: { color: Colors.brand.primary, fontWeight: '700' },
});
