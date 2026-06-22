// app/(tabs)/search/results.tsx
// Trip search results — filtered by origin/destination/date from bookingFlowStore.
// Sort: earliest departure or most available seats.

import { useMemo, useState } from 'react';
import { router } from 'expo-router';
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
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { useTrips } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import type { TripDTO } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Types ────────────────────────────────────────────────────────────────────

type Sort = 'earliest' | 'cheapest' | 'seats';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date): string {
    const h  = d.getHours() % 12 || 12;
    const m  = d.getMinutes().toString().padStart(2, '0');
    const ap = d.getHours() >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${ap}`;
}

function fmtDuration(ms: number): string {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({ trip, onPress }: { trip: TripDTO; onPress: () => void }) {
    const dep = new Date(trip.departureTime);
    const arr = new Date(trip.arrivalEstimate);

    const depStr      = fmtTime(dep);
    const arrStr      = fmtTime(arr);
    const durationStr = fmtDuration(arr.getTime() - dep.getTime());

    const seatsLeft = trip.availableSeats ?? trip.totalSeats ?? trip.bus?.capacity;
    const soldOut   = trip.availableSeats === 0;
    const lowSeats  = !soldOut && seatsLeft != null && seatsLeft <= 5;

    const seatsColor = soldOut  ? Colors.semantic.error
        : lowSeats              ? Colors.semantic.warning
        : Colors.semantic.success;

    // Vehicle label — prefer real data over fallback
    const busModel   = trip.bus?.model;
    const busPlate   = trip.bus?.plateNumber;
    const driverName = trip.driver?.fullName ?? trip.driver?.name;
    const amenities  = trip.bus?.amenities ?? [];

    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                soldOut && styles.cardDimmed,
                pressed && !soldOut && styles.cardPressed,
            ]}
            onPress={soldOut ? undefined : onPress}
            disabled={soldOut}
            accessibilityRole="button"
            accessibilityLabel={`Trip departing at ${depStr}`}
        >
            {/* ── Left accent stripe ── */}
            <View style={[styles.accent, soldOut && styles.accentDimmed]} />

            <View style={styles.cardInner}>
                {/* ── Times row ── */}
                <View style={styles.timesRow}>
                    <View style={styles.timeBlock}>
                        <Text style={styles.timeText}>{depStr}</Text>
                        <Text style={styles.timeLabel}>Departure</Text>
                    </View>

                    <View style={styles.durationWrap}>
                        <View style={styles.durationLine} />
                        <View style={styles.durationBubble}>
                            <Text style={styles.durationText}>{durationStr}</Text>
                        </View>
                        <View style={styles.durationLine} />
                    </View>

                    <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
                        <Text style={styles.timeText}>{arrStr}</Text>
                        <Text style={styles.timeLabel}>Arrival (est.)</Text>
                    </View>
                </View>

                {/* ── Divider ── */}
                <View style={styles.innerDivider} />

                {/* ── Vehicle + Price row ── */}
                <View style={styles.detailRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                        {/* Bus info */}
                        <View style={styles.busRow}>
                            <Text style={styles.busIcon}>🚌</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.busModel} numberOfLines={1}>
                                    {busModel ?? 'Adrash Coach'}
                                    {busPlate ? `  ·  ${busPlate}` : ''}
                                </Text>
                                {driverName ? (
                                    <Text style={styles.driverText} numberOfLines={1}>
                                        👤 {driverName}
                                        {trip.driver?.rating != null
                                            ? `  ★ ${trip.driver.rating.toFixed(1)}`
                                            : ''}
                                    </Text>
                                ) : null}
                            </View>
                        </View>

                        {/* Amenity chips */}
                        {amenities.length > 0 && (
                            <View style={styles.amenitiesRow}>
                                {amenities.slice(0, 3).map((a, i) => (
                                    <View key={i} style={styles.amenityChip}>
                                        <Text style={styles.amenityText}>{a}</Text>
                                    </View>
                                ))}
                                {amenities.length > 3 && (
                                    <Text style={styles.amenityMore}>+{amenities.length - 3}</Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Price block */}
                    <View style={styles.priceBlock}>
                        {trip.fare != null ? (
                            <>
                                <Text style={styles.fareFrom}>from</Text>
                                <Text style={styles.fareValue}>ETB {trip.fare}</Text>
                                <Text style={styles.farePer}>/ seat</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.fareFrom}>price</Text>
                                <Text style={styles.fareTbd}>at booking</Text>
                            </>
                        )}
                    </View>
                </View>

                {/* ── Seats status bar ── */}
                <View style={[styles.seatsBar, { backgroundColor: seatsColor + '18' }]}>
                    <View style={[styles.seatsDot, { backgroundColor: seatsColor }]} />
                    <Text style={[styles.seatsLabel, { color: seatsColor }]}>
                        {soldOut
                            ? 'Sold out'
                            : seatsLeft != null
                                ? (lowSeats
                                    ? `Only ${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left — book fast!`
                                    : `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} available`)
                                : 'Seats available'}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ResultsScreen() {
    const [sort, setSort] = useState<Sort>('earliest');
    const flow = useBookingFlowStore();

    const tripFilters = useMemo(() => {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Guard: if the persisted date is missing or corrupt, fall back to today.
        // An invalid date string causes new Date(...).toISOString() to throw a
        // RangeError which crashes the screen entirely.
        const dateStr = (flow.date && /^\d{4}-\d{2}-\d{2}$/.test(flow.date))
            ? flow.date
            : todayStr;

        const isToday = dateStr === todayStr;

        const from = isToday
            ? new Date(Date.now() - 10 * 60 * 1000).toISOString()
            : new Date(`${dateStr}T00:00:00`).toISOString();

        const to = new Date(`${dateStr}T23:59:59.999`).toISOString();

        return {
            ...(flow.selectedRoute?.id ? { routeId: flow.selectedRoute.id } : {}),
            from,
            to,
            status: 'Scheduled' as const,
        };
    }, [flow.selectedRoute?.id, flow.date]);

    const query = useTrips(tripFilters);

    const trips = useMemo(() => {
        const all = query.data?.pages.flatMap((p) => p.items) ?? [];
        const graceCutoff = Date.now() - 10 * 60 * 1000;
        let visible = all.filter((t) => new Date(t.departureTime).getTime() >= graceCutoff);

        // When the server couldn't resolve a routeId filter (no matching local route),
        // filter client-side so an unrelated route's trips don't bleed in.
        // Only filter trips that have embedded route data — trips without it pass through
        // (the server already applied its own date/status filters; we can't client-filter
        // what we can't see, and hiding everything is worse than showing a few extras).
        if (!flow.selectedRoute && (flow.origin || flow.destination)) {
            const oLower = flow.origin.toLowerCase();
            const dLower = flow.destination.toLowerCase();
            visible = visible.filter((t) => {
                if (!t.route) return true;
                const ro = (t.route.originCity ?? '').toLowerCase();
                const rd = (t.route.destinationCity ?? '').toLowerCase();
                return (
                    (!flow.origin || ro.includes(oLower)) &&
                    (!flow.destination || rd.includes(dLower))
                );
            });
        }

        return [...visible].sort((a, b) => {
            if (sort === 'earliest') return +new Date(a.departureTime) - +new Date(b.departureTime);
            if (sort === 'cheapest') return (a.fare ?? 999999) - (b.fare ?? 999999);
            return (b.availableSeats ?? 999) - (a.availableSeats ?? 999);
        });
    }, [query.data, sort, flow.selectedRoute, flow.origin, flow.destination]);

    function selectTrip(trip: TripDTO) {
        // Only block on an explicit zero — null/undefined means the API didn't return
        // the count yet (e.g. new trip), not that it's sold out.
        if (trip.availableSeats === 0) return;
        flow.selectTrip(trip);
        router.push('/(tabs)/booking/pickup');
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.inner}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Text style={styles.back}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={styles.routeTitle}>
                        {flow.origin}  →  {flow.destination}
                    </Text>
                    <Text style={styles.routeMeta}>
                        {flow.date}  ·  {flow.passengersCount} passenger{flow.passengersCount !== 1 ? 's' : ''}
                    </Text>
                </View>
                <Pressable onPress={() => router.push('/(tabs)')}>
                    <Text style={styles.editLink}>Edit</Text>
                </Pressable>
            </View>

            {/* ── Sort pills ── */}
            <View style={styles.sortRow}>
                {(['earliest', 'cheapest', 'seats'] as Sort[]).map((s) => (
                    <Pressable
                        key={s}
                        style={[styles.pill, sort === s && styles.pillActive]}
                        onPress={() => setSort(s)}
                    >
                        <Text style={[styles.pillText, sort === s && styles.pillTextActive]}>
                            {s === 'earliest' ? 'Earliest' : s === 'cheapest' ? 'Cheapest' : 'Most seats'}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* ── Results ── */}
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
                        <Text style={styles.loadingText}>Finding trips…</Text>
                    </View>
                ) : query.isError ? (
                    <View style={styles.centred}>
                        <Text style={styles.emptyIcon}>⚠️</Text>
                        <Text style={styles.emptyText}>Could not load trips</Text>
                        <Pressable style={styles.retryBtn} onPress={() => void query.refetch()}>
                            <Text style={styles.retryText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : trips.length === 0 ? (
                    <View style={styles.centred}>
                        <Text style={styles.emptyIcon}>🚌</Text>
                        <Text style={styles.emptyText}>No upcoming trips found</Text>
                        <Text style={styles.emptySubText}>
                            Try a different date or select a route from the home screen
                        </Text>
                        <Pressable style={styles.retryBtn} onPress={() => router.push('/(tabs)')}>
                            <Text style={styles.retryText}>Change search</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <Text style={styles.resultCount}>
                            {trips.length} trip{trips.length !== 1 ? 's' : ''} found
                        </Text>

                        {trips.map((t) => (
                            <TripCard
                                key={t.id}
                                trip={t}
                                onPress={() => selectTrip(t)}
                            />
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
                                    <Text style={styles.loadMoreText}>Load more</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.lg,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    backBtn:    { padding: 4 },
    back:       { fontSize: 24, color: Colors.text.primary, fontWeight: '600' },
    routeTitle: { fontWeight: '800', fontSize: 15, color: Colors.text.primary },
    routeMeta:  { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
    editLink:   { color: Colors.brand.primary, fontWeight: '800', fontSize: 14 },

    sortRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        padding: Spacing.md,
        backgroundColor: Colors.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    pill: {
        paddingHorizontal: Spacing.md, paddingVertical: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.secondary,
    },
    pillActive:    { backgroundColor: Colors.brand.primary },
    pillText:      { color: Colors.text.secondary, fontWeight: '600', fontSize: 13 },
    pillTextActive: { color: '#fff' },

    list:        { padding: Spacing.lg, gap: Spacing.md },
    resultCount: { color: Colors.text.tertiary, fontSize: 13, fontWeight: '600' },

    // ── Card ──
    card: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        flexDirection: 'row',
        ...Shadow.md,
    },
    cardDimmed:  { opacity: 0.5 },
    cardPressed: { opacity: 0.85 },

    accent: {
        width: 4,
        backgroundColor: Colors.brand.primary,
    },
    accentDimmed: { backgroundColor: Colors.neutral.gray300 },

    cardInner: {
        flex: 1,
        padding: Spacing.md,
        gap: Spacing.sm,
    },

    // ── Times ──
    timesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    timeBlock: { alignItems: 'flex-start', minWidth: 72 },
    timeText:  { fontSize: 22, fontWeight: '900', color: Colors.text.primary },
    timeLabel: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600', marginTop: 1 },

    durationWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
    },
    durationLine: {
        flex: 1, height: 1,
        backgroundColor: Colors.brand.primary,
        opacity: 0.25,
    },
    durationBubble: {
        backgroundColor: Colors.brand.primaryTint,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8, paddingVertical: 3,
        marginHorizontal: 4,
    },
    durationText: {
        fontSize: 10, fontWeight: '800',
        color: Colors.brand.primary,
    },

    innerDivider: {
        height: 1,
        backgroundColor: Colors.border.light,
        marginVertical: 2,
    },

    // ── Detail row ──
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },

    busRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    busIcon:   { fontSize: 18, marginTop: 1 },
    busModel:  { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
    driverText:{ fontSize: 11, color: Colors.text.tertiary, marginTop: 2 },

    amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    amenityChip: {
        backgroundColor: Colors.background.secondary,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8, paddingVertical: 3,
        borderWidth: 1,
        borderColor: Colors.border.light,
    },
    amenityText: { fontSize: 10, color: Colors.text.secondary, fontWeight: '600' },
    amenityMore: { fontSize: 10, color: Colors.text.tertiary, alignSelf: 'center' },

    // ── Price ──
    priceBlock: { alignItems: 'flex-end', minWidth: 80, gap: 1 },
    fareFrom:   { fontSize: 10, color: Colors.text.tertiary, fontWeight: '600' },
    fareValue:  { fontSize: 18, fontWeight: '900', color: Colors.brand.primary },
    farePer:    { fontSize: 10, color: Colors.text.tertiary },
    fareTbd: {
        fontSize: 12, fontWeight: '700',
        color: Colors.text.tertiary,
        fontStyle: 'italic',
    },

    // ── Seats bar ──
    seatsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: BorderRadius.md,
        paddingHorizontal: 10, paddingVertical: 6,
    },
    seatsDot:   { width: 7, height: 7, borderRadius: 4 },
    seatsLabel: { fontSize: 12, fontWeight: '700' },

    centred:      { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['4xl'], gap: Spacing.md },
    emptyIcon:    { fontSize: 44 },
    emptyText:    { fontWeight: '700', color: Colors.text.primary, textAlign: 'center' },
    emptySubText: { color: Colors.text.tertiary, textAlign: 'center', fontSize: 13 },
    loadingText:  { color: Colors.text.tertiary },
    retryBtn: {
        backgroundColor: Colors.brand.primary,
        paddingHorizontal: Spacing.xl, paddingVertical: 10,
        borderRadius: BorderRadius.lg,
    },
    retryText: { color: '#fff', fontWeight: '700' },

    loadMore:     { alignItems: 'center', padding: Spacing.lg },
    loadMoreText: { color: Colors.brand.primary, fontWeight: '700' },
});
