// app/(tabs)/booking/pickup.tsx
//
// Pickup selection — redesigned.
//   • Dropoff is REMOVED from the UI — the terminal (last isDropoff stop) is
//     auto-selected whenever the passenger chooses a boarding point.
//   • Real MapView shows the route with markers and a connecting polyline.
//     Falls back to a visual timeline when coordinates are unavailable.
//   • Single-selection card list for boarding points.

import { useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { hasGoogleMaps } from '@/lib/maps';
import { StateView } from '@/features/passenger-booking/components/BookingUi';
import { useRouteBundle } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import type { StopDTO } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Map region helper ────────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number; }

function calcRegion(coords: LatLng[]) {
    const valid = coords.filter((c) => (c.lat !== 0 || c.lng !== 0) && c.lat && c.lng);
    if (valid.length === 0) return null;
    const lats = valid.map((c) => c.lat);
    const lngs = valid.map((c) => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
        latitude:        (minLat + maxLat) / 2,
        longitude:       (minLng + maxLng) / 2,
        latitudeDelta:   Math.max((maxLat - minLat) * 1.8, 0.01),
        longitudeDelta:  Math.max((maxLng - minLng) * 1.8, 0.01),
    };
}

// ─── Route timeline (fallback when no map coordinates) ───────────────────────

function RouteFallback({ stops, selectedPickupId }: { stops: StopDTO[]; selectedPickupId?: string }) {
    const sorted = [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    return (
        <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Route Overview</Text>
            {sorted.map((stop, i) => {
                const isLast     = i === sorted.length - 1;
                const isSelected = stop.id === selectedPickupId;
                const dotColor   = stop.isDropoff
                    ? Colors.semantic.error
                    : isSelected ? Colors.brand.primary : Colors.semantic.success;

                return (
                    <View key={stop.id} style={styles.timelineRow}>
                        <View style={styles.timelineLeft}>
                            <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                            {!isLast && <View style={styles.timelineConnector} />}
                        </View>
                        <View style={[styles.timelineInfo, isSelected && styles.timelineInfoSelected]}>
                            <Text style={[styles.timelineStopName, isSelected && styles.timelineStopNameSelected]}>
                                {stop.name}
                            </Text>
                            <Text style={styles.timelineStopType}>
                                {stop.isDropoff
                                    ? '🏁 Terminal'
                                    : isSelected ? '✅ Your boarding point' : '🟢 Boarding point'}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PickupScreen() {
    const f = useBookingFlowStore();

    // Derive route ID from the selected trip — selectedRoute is not set by selectTrip()
    const routeId = f.selectedTrip?.routeId ?? f.selectedTrip?.route?.id ?? f.selectedRoute?.id;
    const q = useRouteBundle(routeId);

    const stops   = q.data?.stops   ?? [];
    const pickups = q.data?.pickups ?? [];

    // The destination terminal is always the last isDropoff stop on the route
    // (the destination city the user searched for). It is fixed — not user-selectable.
    const terminal = useMemo(
        () => [...stops]
            .filter((s) => s.isDropoff)
            .sort((a, b) => b.sequenceOrder - a.sequenceOrder)[0] ?? null,
        [stops],
    );

    // Keep selectedDropoff in sync with the terminal whenever stops load
    useEffect(() => {
        f.selectDropoff(terminal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminal?.id]);

    // ── Map data ──────────────────────────────────────────────────────────────
    const stopCoords = useMemo(
        () => stops.map((s) => ({ lat: s.lat, lng: s.lng })),
        [stops],
    );
    const mapRegion = useMemo(() => calcRegion(stopCoords), [stopCoords]);
    // Only render the native map when coordinates exist AND a Google Maps key is
    // configured — otherwise MapView crashes on Android.
    const hasMap    = mapRegion !== null && hasGoogleMaps;

    const polylineCoords = useMemo(
        () => [...stops]
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            .filter((s) => s.lat && s.lng)
            .map((s) => ({ latitude: s.lat, longitude: s.lng })),
        [stops],
    );

    const canContinue = Boolean(f.selectedPickup && f.selectedDropoff);

    // ── Loading / error states ────────────────────────────────────────────────
    if (q.isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StateView title="Loading route…" loading />
            </SafeAreaView>
        );
    }
    if (q.isError) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StateView
                    title="Could not load stops"
                    actionLabel="Retry"
                    onAction={() => void q.refetch()}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.inner}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Choose Boarding Point</Text>
                    <Text style={styles.headerSub} numberOfLines={1}>
                        {f.origin}  →  {f.destination}
                    </Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Map or fallback timeline ── */}
                {hasMap ? (
                    <View style={styles.mapCard}>
                        <MapView
                            style={styles.map}
                            initialRegion={mapRegion}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            rotateEnabled={false}
                            pitchEnabled={false}
                        >
                            {/* Polyline connecting stops in sequence */}
                            {polylineCoords.length >= 2 && (
                                <Polyline
                                    coordinates={polylineCoords}
                                    strokeColor={Colors.brand.primary}
                                    strokeWidth={3}
                                    lineDashPattern={[8, 4]}
                                />
                            )}

                            {/* Markers for each stop */}
                            {stops
                                .filter((s) => s.lat && s.lng)
                                .map((stop) => {
                                    const isSelected = f.selectedPickup?.id === stop.id;
                                    const isTerminal = stop.isDropoff;
                                    return (
                                        <Marker
                                            key={stop.id}
                                            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                                            title={stop.name}
                                            description={isTerminal ? 'Terminal' : 'Boarding point'}
                                            pinColor={
                                                isSelected   ? Colors.brand.primary
                                                : isTerminal ? Colors.semantic.error
                                                : Colors.semantic.success
                                            }
                                        />
                                    );
                                })}
                        </MapView>

                        {/* Map legend */}
                        <View style={styles.mapLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: Colors.semantic.success }]} />
                                <Text style={styles.legendText}>Boarding</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: Colors.semantic.error }]} />
                                <Text style={styles.legendText}>Terminal</Text>
                            </View>
                            {f.selectedPickup && (
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: Colors.brand.primary }]} />
                                    <Text style={styles.legendText}>Your stop</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ) : (
                    <RouteFallback
                        stops={stops}
                        selectedPickupId={f.selectedPickup?.id}
                    />
                )}

                {/* ── Stop list timeline (always shown below map) ── */}
                {hasMap && stops.length > 0 && (
                    <RouteFallback
                        stops={stops}
                        selectedPickupId={f.selectedPickup?.id}
                    />
                )}

                {/* ── Boarding point selection ── */}
                <Text style={styles.sectionLabel}>Select your boarding point</Text>

                {pickups.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No boarding points available for this route.</Text>
                    </View>
                ) : (
                    pickups.map((p) => {
                        const active = f.selectedPickup?.id === p.id;
                        return (
                            <Pressable
                                key={p.id}
                                style={[styles.pickupCard, active && styles.pickupCardActive]}
                                onPress={() => f.selectPickup(p)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: active }}
                            >
                                {/* Accent stripe */}
                                <View style={[styles.pickupAccent, active && styles.pickupAccentActive]} />

                                <View style={styles.pickupBody}>
                                    {/* Radio */}
                                    <View style={[styles.radio, active && styles.radioActive]}>
                                        {active && <View style={styles.radioInner} />}
                                    </View>

                                    <View style={{ flex: 1, gap: 3 }}>
                                        <Text style={[styles.pickupName, active && styles.pickupNameActive]}>
                                            {p.name}
                                        </Text>
                                        {p.description ? (
                                            <Text style={styles.pickupDesc}>{p.description}</Text>
                                        ) : null}
                                    </View>

                                    <Text style={styles.pickupPin}>📍</Text>
                                </View>
                            </Pressable>
                        );
                    })
                )}

                {/* ── Fixed destination (always the destination city from search) ── */}
                <View style={styles.destinationBanner}>
                    <View style={styles.destinationIcon}>
                        <Text style={styles.destinationIconText}>🏁</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.destinationLabel}>Your destination (fixed)</Text>
                        <Text style={styles.destinationName}>
                            {f.selectedDropoff?.name ?? f.destination}
                        </Text>
                    </View>
                    <Text style={styles.destinationLock}>🔒</Text>
                </View>

                {/* ── Continue button ── */}
                <Pressable
                    style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
                    disabled={!canContinue}
                    onPress={() => {
                        f.setSeats(Array.from({ length: f.passengersCount }, (_, i) => i + 1));
                        router.push('/(tabs)/booking/passengers');
                    }}
                    accessibilityRole="button"
                >
                    <Text style={styles.continueBtnText}>
                        {canContinue ? 'Continue  →' : 'Select a boarding point'}
                    </Text>
                </Pressable>

                <View style={{ height: Spacing.lg }} />
            </ScrollView>
          </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.brand.primaryDark },
    inner:     { flex: 1, backgroundColor: Colors.background.secondary },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    backBtn:    { padding: 4 },
    backText:   { fontSize: 22, color: Colors.text.primary, fontWeight: '600' },
    headerTitle:{ fontSize: 18, fontWeight: '900', color: Colors.text.primary },
    headerSub:  { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },

    content: { padding: Spacing.lg, gap: Spacing.md },

    // ── Map card ──
    mapCard: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadow.md,
    },
    map: { width: '100%', height: 240 },
    mapLegend: {
        backgroundColor: Colors.background.primary,
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border.light,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot:  { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },

    // ── Route timeline card ──
    timelineCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        ...Shadow.sm,
        gap: 0,
    },
    timelineTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.text.primary,
        marginBottom: Spacing.sm,
    },
    timelineRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, minHeight: 56 },
    timelineLeft: { alignItems: 'center', width: 20, paddingTop: 4 },
    timelineDot:  { width: 12, height: 12, borderRadius: 6 },
    timelineConnector: {
        flex: 1, width: 2,
        backgroundColor: Colors.border.medium,
        marginTop: 4, marginBottom: -4,
    },
    timelineInfo: {
        flex: 1, gap: 3,
        paddingVertical: 4,
        borderRadius: BorderRadius.md,
        paddingHorizontal: 8,
    },
    timelineInfoSelected: { backgroundColor: Colors.brand.primaryTint },
    timelineStopName:     { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
    timelineStopNameSelected: { color: Colors.brand.primary },
    timelineStopType: { fontSize: 11, color: Colors.text.tertiary },

    // ── Section label ──
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.text.primary,
        letterSpacing: 0.3,
        marginTop: Spacing.xs,
    },

    // ── Pickup cards ──
    pickupCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        flexDirection: 'row',
        borderWidth: 1.5,
        borderColor: Colors.border.light,
        ...Shadow.sm,
    },
    pickupCardActive: {
        borderColor: Colors.brand.primary,
        backgroundColor: Colors.brand.primaryTint,
    },
    pickupAccent:       { width: 4, backgroundColor: Colors.border.medium },
    pickupAccentActive: { backgroundColor: Colors.brand.primary },
    pickupBody: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
    },
    radio: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: Colors.border.medium,
        alignItems: 'center', justifyContent: 'center',
    },
    radioActive: { borderColor: Colors.brand.primary },
    radioInner: {
        width: 11, height: 11, borderRadius: 6,
        backgroundColor: Colors.brand.primary,
    },
    pickupName:         { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
    pickupNameActive:   { color: Colors.brand.primary },
    pickupDesc:         { fontSize: 12, color: Colors.text.tertiary },
    pickupPin:          { fontSize: 20 },

    // ── Destination banner ──
    destinationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.semantic.infoLight,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.semantic.info + '40',
    },
    destinationIcon: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.semantic.errorLight,
        alignItems: 'center', justifyContent: 'center',
    },
    destinationIconText: { fontSize: 20 },
    destinationLabel:    { fontSize: 11, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.3 },
    destinationName:     { fontSize: 15, fontWeight: '800', color: Colors.text.primary, marginTop: 2 },
    destinationLock:     { fontSize: 16, marginLeft: 8 },

    // ── Continue button ──
    continueBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.xs,
        ...Shadow.sm,
    },
    continueBtnDisabled: { opacity: 0.45 },
    continueBtnText:     { color: Colors.neutral.white, fontWeight: '800', fontSize: 16 },

    emptyState: { padding: Spacing.lg, alignItems: 'center' },
    emptyText:  { color: Colors.text.tertiary, textAlign: 'center' },
});
