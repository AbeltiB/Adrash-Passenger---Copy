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

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({ trip, onPress }: { trip: TripDTO; onPress: () => void }) {
    const dep = new Date(trip.departureTime);
    const arr = new Date(trip.arrivalEstimate);

    const depStr = dep.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
    const arrStr = arr.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });

    const durationMs  = arr.getTime() - dep.getTime();
    const durationHrs = Math.floor(durationMs / 3_600_000);
    const durationMin = Math.floor((durationMs % 3_600_000) / 60_000);
    const durationStr = durationMin > 0 ? `${durationHrs}h ${durationMin}m` : `${durationHrs}h`;

    // availableSeats is optional — the API may omit it on a new trip.
    // Treat null/undefined as "unknown" (not sold out).
    // Fall back to totalSeats or bus capacity so fresh trips aren't shown as full.
    const hasSeatsData  = trip.availableSeats != null;
    const seatsLeft     = trip.availableSeats ?? trip.totalSeats ?? trip.bus?.capacity;
    const soldOut       = trip.availableSeats === 0; // only explicit zero = truly sold out
    const seatsColor    = (seatsLeft ?? 1) <= 3
        ? Colors.semantic.warning
        : Colors.semantic.success;

    const amenities = trip.bus?.amenities ?? [];

    return (
        <Pressable
            style={styles.card}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Trip departing at ${depStr}`}
        >
            {/* ── Times row ── */}
            <View style={styles.timesRow}>
                <Text style={styles.time}>{depStr}</Text>
                <View style={styles.lineWrap}>
                    <View style={styles.dot} />
                    <View style={styles.line} />
                    <Text style={styles.duration}>{durationStr}</Text>
                    <View style={styles.line} />
                    <View style={styles.dot} />
                </View>
                <Text style={styles.time}>{arrStr}</Text>
            </View>

            {/* ── Bus + seats ── */}
            <View style={styles.infoRow}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.busText}>
                        🚌  {trip.bus?.model ?? 'Adrash Coach'}
                        {trip.bus?.plateNumber ? `  ·  ${trip.bus.plateNumber}` : ''}
                    </Text>
                    <Text style={[styles.seatsText, { color: seatsColor }]}>
                        {seatsLeft != null
                            ? `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} available`
                            : 'Seats available'}
                    </Text>
                    {amenities.length > 0 && (
                        <Text style={styles.amenities}>
                            {amenities.join('  ·  ')}
                        </Text>
                    )}
                </View>
                <View style={styles.priceBox}>
                    <Text style={styles.priceLabel}>From</Text>
                    {trip.fare != null ? (
                        <Text style={styles.price}>ETB {trip.fare}</Text>
                    ) : (
                        <Text style={[styles.price, styles.priceTbd]}>TBD</Text>
                    )}
                    <Text style={styles.priceSub}>/ seat</Text>
                </View>
            </View>

            {/* ── Low seats warning ── */}
            {hasSeatsData && !soldOut && seatsLeft != null && seatsLeft <= 5 && (
                <View style={styles.urgencyBadge}>
                    <Text style={styles.urgencyText}>Only {seatsLeft} left!</Text>
                </View>
            )}

            {soldOut && (
                <View style={styles.soldOutBadge}>
                    <Text style={styles.soldOutText}>Sold out</Text>
                </View>
            )}
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
        // Client-side: remove trips that departed more than 30 min ago
        // (handles cases where the server returns more than requested).
        const graceCutoff = Date.now() - 10 * 60 * 1000;
        const visible = all.filter((t) => new Date(t.departureTime).getTime() >= graceCutoff);
        return [...visible].sort((a, b) => {
            if (sort === 'earliest') return +new Date(a.departureTime) - +new Date(b.departureTime);
            if (sort === 'cheapest') return (a.fare ?? 999999) - (b.fare ?? 999999);
            // Treat null/undefined as "high" so they sort above explicitly sold-out trips
            return (b.availableSeats ?? 999) - (a.availableSeats ?? 999);
        });
    }, [query.data, sort]);

    function selectTrip(trip: TripDTO) {
        // Only block on an explicit zero — null/undefined means the API didn't return
        // the count yet (e.g. new trip), not that it's sold out.
        if (trip.availableSeats === 0) return;
        flow.selectTrip(trip);
        router.push('/(tabs)/booking/pickup');
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },

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

    list:         { padding: Spacing.lg, gap: Spacing.md },
    resultCount:  { color: Colors.text.tertiary, fontSize: 13, fontWeight: '600' },

    card: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.sm,
    },

    timesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    time:     { fontWeight: '900', fontSize: 20, color: Colors.text.primary, width: 68 },
    lineWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand.primary },
    line:     { flex: 1, height: 2, backgroundColor: Colors.brand.primary, opacity: 0.3 },
    duration: { color: Colors.text.tertiary, fontSize: 11, fontWeight: '600', flexShrink: 0 },

    infoRow:  { flexDirection: 'row', alignItems: 'flex-start' },
    busText:  { fontWeight: '700', color: Colors.text.primary, fontSize: 13 },
    seatsText: { fontSize: 12, fontWeight: '700' },
    amenities: { color: Colors.text.tertiary, fontSize: 11 },

    priceBox:  { alignItems: 'flex-end', flexShrink: 0, gap: 1 },
    priceLabel: { color: Colors.text.tertiary, fontSize: 11 },
    price:     { fontWeight: '900', fontSize: 20, color: Colors.brand.primary },
    priceSub:  { color: Colors.text.tertiary, fontSize: 11 },
    priceTbd:  { fontSize: 16, color: Colors.text.tertiary },

    urgencyBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.semantic.warningLight,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    urgencyText: { color: Colors.semantic.warning, fontWeight: '800', fontSize: 11 },

    soldOutBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.semantic.errorLight,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    soldOutText: { color: Colors.semantic.error, fontWeight: '800', fontSize: 11 },

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
