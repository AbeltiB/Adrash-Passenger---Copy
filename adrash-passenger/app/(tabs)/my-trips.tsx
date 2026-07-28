// app/(tabs)/my-trips.tsx
// My Trips tab — three tabs: Upcoming / Active / Past
// APIs: GET /bookings?status=Confirmed|CheckedIn|Completed (paginated)

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import type { BookingDTO, BookingStatusDTO } from '@/features/passenger-booking/dtos/bookingDtos';
import { useBookings, useRouteBundle } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { QRCode } from '@/components/QRCode';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'upcoming' | 'active' | 'past';

const TAB_STATUS: Record<Tab, BookingStatusDTO> = {
    upcoming: 'Confirmed',
    active:   'CheckedIn',
    past:     'Completed',
};

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatusDTO }) {
    const map: Record<BookingStatusDTO, { label: string; bg: string; fg: string }> = {
        Confirmed:  { label: 'Confirmed',   bg: Colors.semantic.successLight, fg: Colors.semantic.success },
        CheckedIn:  { label: 'Checked in',  bg: Colors.semantic.infoLight,    fg: Colors.semantic.info },
        Completed:  { label: 'Completed',   bg: Colors.neutral.gray100,       fg: Colors.neutral.gray500 },
        Pending:    { label: 'Pending',     bg: Colors.semantic.warningLight,  fg: Colors.semantic.warning },
        Cancelled:  { label: 'Cancelled',   bg: Colors.semantic.errorLight,   fg: Colors.semantic.error },
        NoShow:     { label: 'No-show',     bg: Colors.semantic.errorLight,   fg: Colors.semantic.error },
    };
    const c = map[status] ?? map.Pending;
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={[styles.badgeText, { color: c.fg }]}>{c.label}</Text>
        </View>
    );
}

// ─── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({ booking, tab }: { booking: BookingDTO; tab: Tab }) {
    const { t: tFn } = useTranslation();
    const route  = booking.trip?.route;
    const driver = booking.trip?.driver;
    const bus    = booking.trip?.bus;
    const depTime = booking.trip?.departureTime
        ? new Date(booking.trip.departureTime).toLocaleString('en-ET', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
          })
        : '—';

    const driverName  = driver?.fullName ?? driver?.name ?? null;
    const busLabel    = [bus?.model, bus?.plateNumber].filter(Boolean).join('  ·  ') || null;
    const hasVehicleInfo = Boolean(driverName ?? busLabel);

    const isInProgress = booking.trip?.status === 'InProgress';
    // Each passenger now has their own individually-verifiable QR (not one
    // shared per booking) — prefer the first passenger's own code, falling
    // back to the legacy booking-level field for backward compatibility.
    // Must be the server-issued, HMAC-signed payload — never the plaintext
    // bookingReference, which is printed right below it and could otherwise
    // be used to forge a matching-looking (but unsigned) boarding pass.
    const passengerCount = booking.passengerDetails?.length ?? 1;
    const qrData = booking.passengerDetails?.[0]?.qrCode ?? booking.qrCode ?? null;

    // The booking API only ever returns pickupLocationId (a raw id), never a
    // resolved name — booking.pickupLocation was always going to be empty.
    // Resolve it against the route's own pickup list (cached per routeId, so
    // this is one extra request per distinct route shown, not per card).
    const routeBundle  = useRouteBundle(booking.trip?.routeId);
    const pickupName   = booking.pickupLocation?.name
        ?? routeBundle.data?.pickups?.find((p) => p.id === booking.pickupLocationId)?.name
        ?? null;
    // Drop-off is always the route's destination terminal — the city name is
    // already reliably present on booking.trip.route (unlike a resolved stop),
    // so prefer it over the equally-unpopulated dropoffStop.name.
    const dropoffName = booking.dropoffStop?.name ?? route?.destinationCity ?? null;

    return (
        <View style={styles.card}>
            {/* Route + status */}
            <View style={styles.cardHeader}>
                <Text style={styles.routeText}>
                    {route?.originCity ?? 'Origin'} → {route?.destinationCity ?? 'Destination'}
                </Text>
                <StatusBadge status={booking.status} />
            </View>

            <Text style={styles.cardMeta}>{depTime}</Text>

            <Text style={styles.cardSub}>
                Ref: <Text style={styles.refText}>{booking.bookingReference}</Text>
                {'  ·  '}Seat{booking.seatNumbers.length > 1 ? 's' : ''}{' '}
                {booking.seatNumbers.join(', ')}
            </Text>

            <Text style={styles.fareText}>
                ETB {(booking.totalFare ?? 0).toFixed(2)}
            </Text>

            {/* Driver + vehicle info */}
            {hasVehicleInfo && (
                <View style={styles.vehicleRow}>
                    {driverName && (
                        <View style={styles.vehicleChip}>
                            <Text style={styles.vehicleChipIcon}>👤</Text>
                            <Text style={styles.vehicleChipText} numberOfLines={1}>{driverName}</Text>
                        </View>
                    )}
                    {busLabel && (
                        <View style={styles.vehicleChip}>
                            <Text style={styles.vehicleChipIcon}>🚌</Text>
                            <Text style={styles.vehicleChipText} numberOfLines={1}>{busLabel}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Pickup + drop-off */}
            <View style={styles.boardingSection}>
                <View style={styles.boardingRow}>
                    <Text style={styles.boardingLabel}>Pickup</Text>
                    <Text style={styles.boardingValue} numberOfLines={1}>
                        {pickupName ?? '—'}
                    </Text>
                </View>
                <View style={styles.boardingDivider} />
                <View style={styles.boardingRow}>
                    <Text style={styles.boardingLabel}>Drop-off</Text>
                    <Text style={styles.boardingValue} numberOfLines={1}>
                        {dropoffName ?? '—'}
                    </Text>
                </View>
            </View>

            {/* QR code — only shown inline when there's exactly one passenger.
                A multi-passenger booking has a separate QR per person now
                (see View ticket); showing just the first one here would look
                like "the" ticket when it's only one of several. */}
            {passengerCount > 1 ? (
                <Text style={styles.multiTicketNote}>
                    🎫 {passengerCount} separate tickets — open "View ticket" for each passenger's own QR
                </Text>
            ) : qrData ? (
                <QRCode value={qrData} size={100} padding={6} />
            ) : tab === 'upcoming' ? (
                <Text style={styles.qrPendingText}>QR code not ready yet — pull to refresh shortly.</Text>
            ) : null}

            {/* Refund status (cancelled/past) */}
            {booking.refundStatus ? (
                <Text style={styles.refundText}>{booking.refundStatus}</Text>
            ) : null}

            {/* Action buttons */}
            <View style={styles.cardActions}>
                {tab === 'active' && (
                    <Pressable
                        style={styles.primaryBtn}
                        onPress={() => router.push({
                            pathname: '/trip/[id]/tracking',
                            params: {
                                id: booking.tripId,
                                originCity: route?.originCity ?? '',
                                destinationCity: route?.destinationCity ?? '',
                            },
                        })}
                    >
                        <Text style={styles.primaryBtnText}>
                            {isInProgress ? 'Track live  📍' : 'Track trip  📍'}
                        </Text>
                    </Pressable>
                )}

                {tab === 'past' && !booking.hasReview && (
                    <Pressable
                        style={styles.primaryBtn}
                        onPress={() => router.push({ pathname: '/reviews/[bookingId]', params: { bookingId: booking.id } })}
                    >
                        <Text style={styles.primaryBtnText}>Rate this trip  ★</Text>
                    </Pressable>
                )}

                {tab === 'past' && booking.hasReview && (
                    <Text style={styles.reviewedText}>✓ Reviewed</Text>
                )}

                {tab === 'upcoming' && (
                    <Pressable
                        style={styles.cancelBtn}
                        onPress={() => router.push(`/trips/${booking.id}/cancel`)}
                    >
                        <Text style={styles.cancelBtnText}>{tFn('trips.cancel_trip')}</Text>
                    </Pressable>
                )}

                <Pressable
                    style={styles.ghostBtn}
                    onPress={() => router.push({
                        pathname: '/(tabs)/trip/[id]',
                        params: { id: booking.id, fromTab: tab },
                    })}
                >
                    <Text style={styles.ghostBtnText}>View ticket</Text>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyTripsTab() {
    const { t: tFn } = useTranslation();
    // "View ticket" passes back the tab it was opened from (see BookingCard
    // below) so returning from the ticket screen lands back on the same
    // tab instead of always resetting to Upcoming.
    const { tab: initialTab } = useLocalSearchParams<{ tab?: Tab }>();
    const [tab, setTab] = useState<Tab>(initialTab ?? 'upcoming');
    const query = useBookings(TAB_STATUS[tab]);

    const bookings = useMemo(
        () => query.data?.pages.flatMap((p) => p.items) ?? [],
        [query.data],
    );

    const emptyMessages: Record<Tab, string> = {
        upcoming: tFn('trips.no_upcoming'),
        active:   tFn('trips.no_active'),
        past:     tFn('trips.no_past'),
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.inner}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Text style={styles.title}>{tFn('trips.title')}</Text>
            </View>

            {/* ── Tab pills ── */}
            <View style={styles.tabRow}>
                {(['upcoming', 'active', 'past'] as Tab[]).map((tabKey) => (
                    <Pressable
                        key={tabKey}
                        style={[styles.tab, tab === tabKey && styles.tabActive]}
                        onPress={() => setTab(tabKey)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: tab === tabKey }}
                    >
                        <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
                            {tFn(`trips.${tabKey}`)}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* ── List ── */}
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
                        <Text style={styles.loadingText}>{tFn('trips.loading')}</Text>
                    </View>
                ) : query.isError ? (
                    <View style={styles.centred}>
                        <Text style={styles.emptyIcon}>⚠️</Text>
                        <Text style={styles.emptyText}>{tFn('trips.could_not_load')}</Text>
                        <Pressable style={styles.retryBtn} onPress={() => void query.refetch()}>
                            <Text style={styles.retryText}>{tFn('common.retry')}</Text>
                        </Pressable>
                    </View>
                ) : bookings.length === 0 ? (
                    <View style={styles.centred}>
                        <Text style={styles.emptyIcon}>🎫</Text>
                        <Text style={styles.emptyText}>{emptyMessages[tab]}</Text>
                        {tab === 'upcoming' && (
                            <Pressable
                                style={styles.retryBtn}
                                onPress={() => router.push('/(tabs)')}
                            >
                                <Text style={styles.retryText}>{tFn('trips.book_trip')}</Text>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <>
                        {bookings.map((b) => (
                            <BookingCard key={b.id} booking={b} tab={tab} />
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
                                    <Text style={styles.loadMoreText}>{tFn('trips.load_more')}</Text>
                                )}
                            </Pressable>
                        )}
                    </>
                )}
            </ScrollView>
          </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.brand.primaryDark },
    inner:     { flex: 1, backgroundColor: Colors.background.secondary },

    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    title: { fontSize: 26, fontWeight: '900', color: Colors.text.primary },

    tabRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    tab: {
        flex: 1, paddingVertical: 10,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.background.primary,
        alignItems: 'center',
    },
    tabActive: { backgroundColor: Colors.brand.primary },
    tabText:   { color: Colors.text.secondary, fontWeight: '700', fontSize: 12 },
    tabTextActive: { color: '#fff' },

    list:    { padding: Spacing.lg, gap: Spacing.md, paddingTop: 0 },

    card: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.sm,
    },
    cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    routeText:   { fontSize: 16, fontWeight: '800', color: Colors.text.primary, flex: 1, marginRight: Spacing.sm },
    cardMeta:    { color: Colors.text.tertiary, fontSize: 13 },
    cardSub:     { color: Colors.text.secondary, fontSize: 13 },
    refText:     { fontFamily: 'monospace', fontWeight: '700', color: Colors.text.primary },
    fareText:    { fontWeight: '800', color: Colors.brand.primary, fontSize: 15 },

    badge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: BorderRadius.full, flexShrink: 0,
    },
    badgeText: { fontSize: 11, fontWeight: '800' },

    refundText: { color: Colors.semantic.info, fontWeight: '700', fontSize: 13 },
    reviewedText: { color: Colors.semantic.success, fontWeight: '700', fontSize: 13 },

    cardActions: { gap: Spacing.sm, marginTop: Spacing.xs },

    primaryBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: 11,
        alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

    ghostBtn: {
        borderWidth: 1, borderColor: Colors.border.medium,
        borderRadius: BorderRadius.md,
        paddingVertical: 11,
        alignItems: 'center',
    },
    ghostBtnText: { color: Colors.text.primary, fontWeight: '700', fontSize: 13 },

    cancelBtn: {
        borderWidth: 1, borderColor: Colors.semantic.error,
        borderRadius: BorderRadius.md,
        paddingVertical: 11,
        alignItems: 'center',
    },
    cancelBtnText: { color: Colors.semantic.error, fontWeight: '700', fontSize: 13 },
    qrPendingText: { color: Colors.text.tertiary, fontSize: 12, fontStyle: 'italic' },
    multiTicketNote: { color: Colors.text.tertiary, fontSize: 12, fontWeight: '600' },

    centred:     { alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'], gap: Spacing.md },
    emptyIcon:   { fontSize: 44 },
    emptyText:   { color: Colors.text.secondary, fontWeight: '600', textAlign: 'center', fontSize: 14 },
    loadingText: { color: Colors.text.tertiary, marginTop: Spacing.sm },
    retryBtn: {
        backgroundColor: Colors.brand.primary,
        paddingHorizontal: Spacing.xl, paddingVertical: 10,
        borderRadius: BorderRadius.lg,
    },
    retryText: { color: '#fff', fontWeight: '700' },

    loadMore:     { alignItems: 'center', padding: Spacing.lg },
    loadMoreText: { color: Colors.brand.primary, fontWeight: '700' },

    boardingSection: {
        backgroundColor: Colors.background.secondary,
        borderRadius: BorderRadius.md,
        paddingVertical: 6, paddingHorizontal: 10,
        gap: 0,
    },
    boardingRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 5,
    },
    boardingDivider: { height: 1, backgroundColor: Colors.border.light },
    boardingLabel:   { fontSize: 12, color: Colors.text.tertiary, fontWeight: '600', flexShrink: 0, marginRight: 8 },
    boardingValue:   { fontSize: 12, color: Colors.text.primary, fontWeight: '700', textAlign: 'right', flex: 1 },

    vehicleRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 2,
    },
    vehicleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: Colors.background.secondary,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm, paddingVertical: 5,
        flexShrink: 1,
    },
    vehicleChipIcon: { fontSize: 13 },
    vehicleChipText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, flexShrink: 1 },
});
