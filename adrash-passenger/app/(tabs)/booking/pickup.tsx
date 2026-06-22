// app/(tabs)/booking/pickup.tsx
//
// Pickup selection — redesigned.
//   • Dropoff is REMOVED from the UI — the terminal (last isDropoff stop) is
//     auto-selected whenever the passenger chooses a boarding point.
//   • Real MapView shows the route with markers and a connecting polyline.
//     Falls back to a visual timeline when coordinates are unavailable.
//   • Single-selection card list for boarding points.

import React, { useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MapLibreGL from '@maplibre/maplibre-react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { MAP_STYLE_URL, MAP_AVAILABLE } from '@/lib/maps';
import { StateView } from '@/features/passenger-booking/components/BookingUi';
import { useRouteBundle } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import type { StopDTO } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Map error boundary (silently hides map on any MapLibre render error) ────

class MapBoundary extends React.Component<
    { children: React.ReactNode },
    { failed: boolean }
> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        if (this.state.failed) return null;
        return this.props.children;
    }
}

// ─── Route timeline ───────────────────────────────────────────────────────────

function RouteFallback({ stops, selectedPickupId }: { stops: StopDTO[]; selectedPickupId?: string | undefined }) {
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

    // Keep selectedDropoff in sync with the terminal whenever stops load or pickup changes.
    // The terminal is fixed (the last isDropoff stop), so it must stay set even after
    // selectPickup is called. Adding f.selectedPickup?.id ensures the effect re-runs
    // when the user picks a boarding point so the dropoff is always confirmed.
    useEffect(() => {
        if (terminal) f.selectDropoff(terminal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminal?.id, f.selectedPickup?.id]);

    // ── Map data (MapLibre — no API key required) ─────────────────────────────
    const validStops = useMemo(
        () => stops.filter((s) => s.lat && s.lng && (s.lat !== 0 || s.lng !== 0)),
        [stops],
    );
    const hasMap = MAP_AVAILABLE && validStops.length > 0;

    // GeoJSON for the route polyline
    const polylineGeoJSON = useMemo(() => {
        const coords = [...validStops]
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            .map((s) => [s.lng, s.lat] as [number, number]);
        if (coords.length < 2) return null;
        return {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: coords },
            properties: {},
        };
    }, [validStops]);

    // Camera bounds to fit all stops
    const mapBounds = useMemo(() => {
        if (validStops.length === 0) return null;
        const lats = validStops.map((s) => s.lat);
        const lngs = validStops.map((s) => s.lng);
        return {
            ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
            sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
        };
    }, [validStops]);

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
                {/* ── Route map (MapLibre — no API key needed) ── */}
                {hasMap ? (
                    <MapBoundary>
                    <View style={styles.mapCard}>
                        <MapLibreGL.Map
                            style={styles.map}
                            mapStyle={MAP_STYLE_URL}
                            logo={false}
                        >
                            {mapBounds && (
                                <MapLibreGL.Camera
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    bounds={{
                                        ne: mapBounds.ne,
                                        sw: mapBounds.sw,
                                        paddingTop: 30,
                                        paddingBottom: 30,
                                        paddingLeft: 20,
                                        paddingRight: 20,
                                    } as any}
                                    duration={0}
                                />
                            )}

                            {polylineGeoJSON && (
                                <MapLibreGL.GeoJSONSource id="route-src" data={polylineGeoJSON}>
                                    <MapLibreGL.Layer
                                        id="route-line"
                                        type="line"
                                        paint={{
                                            'line-color': Colors.brand.primary,
                                            'line-width': 3,
                                            'line-dasharray': [3, 2],
                                        }}
                                    />
                                </MapLibreGL.GeoJSONSource>
                            )}

                            {validStops.map((stop) => {
                                const isSelected = f.selectedPickup?.id === stop.id;
                                const isTerminal = stop.isDropoff;
                                const emoji = isSelected ? '📌' : isTerminal ? '🏁' : '🟢';
                                return (
                                    <MapLibreGL.Marker
                                        key={stop.id}
                                        id={`stop-${stop.id}`}
                                        lngLat={[stop.lng, stop.lat]}
                                    >
                                        <View style={styles.stopPin}>
                                            <Text style={styles.stopPinText}>{emoji}</Text>
                                        </View>
                                    </MapLibreGL.Marker>
                                );
                            })}
                        </MapLibreGL.Map>

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
                    </MapBoundary>
                ) : null}

                {/* Route timeline (always visible below map, or as sole fallback) */}
                <RouteFallback
                    stops={stops}
                    selectedPickupId={f.selectedPickup?.id}
                />

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
    stopPin:     { alignItems: 'center', justifyContent: 'center' },
    stopPinText: { fontSize: 20 },

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
