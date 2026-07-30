// app/trip/[id]/tracking.tsx
// Full-screen live tracking — SignalR primary + GPS polling fallback + SOS.
// Uses MapLibre (no Google Maps API key required).

import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import * as MapLibreGL from '@maplibre/maplibre-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { useTrip, useTripLocation } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { startTracking, stopTracking } from '@/lib/signalr';
import { MAP_STYLE_URL, MAP_AVAILABLE } from '@/lib/maps';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import type { TripLocationDTO } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface LivePosition {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    eta: number | null;
    nextStopName: string | null;
}

// ─── ETA card ─────────────────────────────────────────────────────────────────

function ETACard({
    eta,
    nextStop,
    connectionState,
    onReconnect,
}: {
    eta: number | null;
    nextStop: string | null;
    connectionState: ConnectionState;
    onReconnect: () => void;
}) {
    return (
        <View style={styles.etaCard}>
            {connectionState === 'reconnecting' && (
                <View style={styles.reconnectRow}>
                    <ActivityIndicator size="small" color={Colors.semantic.warning} />
                    <Text style={styles.reconnectText}>Reconnecting…</Text>
                </View>
            )}
            {connectionState === 'disconnected' && (
                <View style={styles.reconnectRow}>
                    <Text style={styles.disconnectText}>⚠️  Connection lost</Text>
                    <Pressable onPress={onReconnect} style={styles.reconnectBtn} accessibilityRole="button">
                        <Text style={styles.reconnectBtnText}>Reconnect</Text>
                    </Pressable>
                </View>
            )}
            <View style={styles.etaRow}>
                <Text style={styles.busEmoji}>🚌</Text>
                <View style={{ flex: 1 }}>
                    {eta !== null ? (
                        <>
                            <Text style={styles.etaLabel}>Arriving at your pickup in</Text>
                            <Text style={styles.etaValue}>{eta} minutes</Text>
                        </>
                    ) : (
                        <Text style={styles.etaLabel}>Waiting for location update…</Text>
                    )}
                    {nextStop && (
                        <Text style={styles.nextStop}>Next stop: {nextStop}</Text>
                    )}
                </View>
                <View style={[styles.liveDot, connectionState === 'connected' && styles.liveDotActive]} />
            </View>
        </View>
    );
}

// ─── Map unavailable fallback ─────────────────────────────────────────────────
// Shared between "native module isn't present" and "MapLibre threw at runtime"
// (via MapErrorBoundary below) — the passenger doesn't need to know which.

function MapUnavailable() {
    return (
        <View style={[styles.map, styles.mapUnavailable]}>
            <Text style={styles.mapUnavailableIcon}>🗺️</Text>
            <Text style={styles.mapUnavailableText}>Live map unavailable</Text>
            <Text style={styles.mapUnavailableSub}>
                You can still see ETA and status updates below.
            </Text>
        </View>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodePolyline(encoded: string): [number, number][] {
    let index = 0;
    const result: [number, number][] = [];
    let lat = 0, lng = 0;
    while (index < encoded.length) {
        let shift = 0, result_val = 0, byte: number;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result_val |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += result_val & 1 ? ~(result_val >> 1) : result_val >> 1;
        shift = 0; result_val = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result_val |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += result_val & 1 ? ~(result_val >> 1) : result_val >> 1;
        // MapLibre uses [longitude, latitude]
        result.push([lng * 1e-5, lat * 1e-5]);
    }
    return result;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrackingScreen() {
    const { id, originCity, destinationCity } = useLocalSearchParams<{
        id: string;
        originCity?: string;
        destinationCity?: string;
    }>();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const tripQuery = useTrip(id);
    const locQuery  = useTripLocation(id);
    const flow      = useBookingFlowStore();

    const [livePos, setLivePos]               = useState<LivePosition | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
    // Bumped by the manual "Reconnect" button once withAutomaticReconnect has
    // exhausted its own retry schedule and the hub has settled into `closed`.
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const cameraRef = useRef<MapLibreGL.CameraRef>(null);

    // ── SignalR setup ──────────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;

        async function connect() {
            try {
                if (!mounted) return;

                const hub = await startTracking();

                hub.onreconnecting(() => { if (mounted) setConnectionState('reconnecting'); });
                hub.onreconnected(() =>  { if (mounted) setConnectionState('connected');    });
                hub.onclose(() =>        { if (mounted) setConnectionState('disconnected'); });

                hub.on('LocationUpdate', (data: {
                    lat: number; lng: number; heading: number;
                    speed?: number; eta?: number; nextStopName?: string;
                }) => {
                    if (!mounted) return;
                    setLivePos({
                        lat:          data.lat,
                        lng:          data.lng,
                        heading:      data.heading,
                        speed:        data.speed ?? 0,
                        eta:          data.eta ?? null,
                        nextStopName: data.nextStopName ?? null,
                    });
                });

                if (mounted) setConnectionState('connected');
            } catch {
                if (mounted) setConnectionState('disconnected');
            }
        }

        void connect();
        return () => {
            mounted = false;
            void stopTracking();
        };
    }, [id, reconnectAttempt]);

    function handleManualReconnect() {
        setConnectionState('connecting');
        setReconnectAttempt((n) => n + 1);
    }

    // ── Animate camera to bus position on each live update ────────────────────
    useEffect(() => {
        if (!livePos) return;
        cameraRef.current?.flyTo({
            center: [livePos.lng, livePos.lat],
            zoom: 14,
            duration: 800,
        });
    }, [livePos]);

    // ── Merge live SignalR pos with polling fallback ───────────────────────────
    const position: TripLocationDTO | LivePosition | null = livePos ?? locQuery.data ?? null;

    // ── SOS ───────────────────────────────────────────────────────────────────
    // There is no backend SOS/emergency endpoint yet — this must never claim to
    // have sent an alert it didn't actually send. The one thing this screen CAN
    // do for real, with no backend change, is call the driver directly using the
    // live trip data already loaded here.
    function triggerSOS() {
        const driverPhone = tripQuery.data?.driver?.phone;
        Alert.alert(
            '⚠️  Emergency',
            driverPhone
                ? "Adrash doesn't have an automatic emergency alert yet. You can call the driver directly right now."
                : "Adrash doesn't have an automatic emergency alert yet. Please call local emergency services directly.",
            [
                { text: 'Cancel', style: 'cancel' },
                ...(driverPhone
                    ? [{
                        text: 'Call driver',
                        style: 'destructive' as const,
                        onPress: () => void Linking.openURL(`tel:${driverPhone}`),
                    }]
                    : []),
            ],
        );
    }

    const trip    = tripQuery.data;
    const pickup  = flow.selectedPickup;
    const dropoff = flow.selectedDropoff;

    // Initial camera coordinate — bus if known, else pickup, else Addis Ababa
    const initialCoord: [number, number] = position
        ? [position.lng, position.lat]
        : pickup
        ? [pickup.lng, pickup.lat]
        : [38.7578, 9.0320]; // Addis Ababa

    // Route polyline as GeoJSON LineString. Guarded: a malformed/truncated
    // polyline string from the server fed straight into MapLibre as NaN/bad
    // coordinates is a real, previously-unhandled crash source on this screen.
    const routeGeoJSON = useMemo(() => {
        if (!trip?.route?.polyline) return null;
        try {
            const coordinates = decodePolyline(trip.route.polyline);
            const valid = coordinates.length >= 2 && coordinates.every(
                ([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat),
            );
            if (!valid) return null;
            return {
                type: 'Feature' as const,
                geometry: { type: 'LineString' as const, coordinates },
                properties: {},
            };
        } catch {
            return null;
        }
    }, [trip?.route?.polyline]);

    // This screen is registered as a top-level Stack.Screen outside (tabs)
    // (see app/_layout.tsx), so it doesn't inherit that group's isAuthenticated
    // guard. A raw deep link could otherwise open a live map + SignalR
    // connection with no session at all.
    if (!isAuthenticated) return <Redirect href="/(auth)" />;

    return (
        <View style={styles.container}>
            {/* ── Map ── */}
            {MAP_AVAILABLE ? (
                <MapErrorBoundary fallback={<MapUnavailable />}>
                    <MapLibreGL.Map
                        style={styles.map}
                        mapStyle={MAP_STYLE_URL}
                        compass={true}
                        logo={false}
                    >
                        <MapLibreGL.Camera
                            ref={cameraRef}
                            initialViewState={{ center: initialCoord, zoom: 13 }}
                        />

                        {/* Passenger's own position, distinct from the bus/pickup/dropoff pins */}
                        <MapLibreGL.UserLocation animated accuracy heading />

                        {/* Route polyline */}
                        {routeGeoJSON && (
                            <MapLibreGL.GeoJSONSource id="route-src" data={routeGeoJSON}>
                                <MapLibreGL.Layer
                                    id="route-line"
                                    type="line"
                                    paint={{ 'line-color': Colors.brand.primary, 'line-width': 4, 'line-opacity': 0.85 }}
                                />
                            </MapLibreGL.GeoJSONSource>
                        )}

                        {/* Pickup marker */}
                        {pickup && (
                            <MapLibreGL.Marker
                                id="pickup"
                                lngLat={[pickup.lng, pickup.lat]}
                            >
                                <View style={styles.pinOuter}>
                                    <Text style={styles.pinEmoji}>📍</Text>
                                </View>
                            </MapLibreGL.Marker>
                        )}

                        {/* Destination marker */}
                        {dropoff && (
                            <MapLibreGL.Marker
                                id="dropoff"
                                lngLat={[dropoff.lng, dropoff.lat]}
                            >
                                <View style={styles.pinOuter}>
                                    <Text style={styles.pinEmoji}>🏁</Text>
                                </View>
                            </MapLibreGL.Marker>
                        )}

                        {/* Live bus */}
                        {position && (
                            <MapLibreGL.Marker
                                id="bus"
                                lngLat={[position.lng, position.lat]}
                            >
                                <View style={styles.busMarker}>
                                    <Text style={styles.busMarkerText}>🚌</Text>
                                </View>
                            </MapLibreGL.Marker>
                        )}
                    </MapLibreGL.Map>
                </MapErrorBoundary>
            ) : (
                <MapUnavailable />
            )}

            {/* ── Header overlay ── */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']} pointerEvents="box-none">
                <View style={styles.header} pointerEvents="auto">
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.back}>←</Text>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerRoute}>
                            {trip?.route?.originCity ?? originCity ?? '…'}  →  {trip?.route?.destinationCity ?? destinationCity ?? '…'}
                        </Text>
                        <Text style={styles.headerStatus}>{trip?.status ?? 'Loading…'}</Text>
                    </View>
                    <View style={styles.liveIndicator}>
                        <View style={[styles.liveDotSmall, connectionState === 'connected' && styles.liveDotSmallActive]} />
                        <Text style={styles.liveLabel}>LIVE</Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* ── Bottom panel: SOS + ETA ── */}
            <SafeAreaView style={styles.bottomPanel} edges={['bottom']} pointerEvents="box-none">
                <View pointerEvents="auto">
                    <View style={styles.actionRow}>
                        <Pressable style={styles.sosBtn} onPress={triggerSOS}>
                            <Text style={styles.sosBtnText}>🛡  SOS</Text>
                        </Pressable>
                    </View>
                    <ETACard
                        eta={livePos?.eta ?? null}
                        nextStop={livePos?.nextStopName ?? null}
                        connectionState={connectionState}
                        onReconnect={handleManualReconnect}
                    />
                </View>
            </SafeAreaView>

            {/* ── Loading overlay ── */}
            {tripQuery.isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.brand.primary} />
                    <Text style={styles.loadingText}>Connecting to bus…</Text>
                </View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: Colors.background.secondary },
    map:            { flex: 1 },
    mapUnavailable: {
        backgroundColor: Colors.background.secondary,
        alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    },
    mapUnavailableIcon: { fontSize: 40 },
    mapUnavailableText: { color: Colors.text.secondary, fontWeight: '700', fontSize: 14 },
    mapUnavailableSub:  { color: Colors.text.tertiary, fontSize: 12 },

    headerOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: Colors.brand.primaryDark,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        margin: Spacing.md,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.md,
    },
    backBtn:       { width: 36, justifyContent: 'center' },
    back:          { fontSize: 22, color: Colors.text.primary, fontWeight: '700' },
    headerRoute:   { fontWeight: '800', fontSize: 14, color: Colors.text.primary },
    headerStatus:  { color: Colors.text.tertiary, fontSize: 11, marginTop: 2 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    liveDotSmall:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.neutral.gray300 },
    liveDotSmallActive: { backgroundColor: Colors.semantic.success },
    liveLabel:     { fontWeight: '900', fontSize: 11, color: Colors.semantic.success, letterSpacing: 1 },

    bottomPanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
    },
    actionRow: {
        flexDirection: 'row', justifyContent: 'flex-end',
        paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    },
    sosBtn: {
        backgroundColor: Colors.semantic.error,
        paddingHorizontal: Spacing.lg, paddingVertical: 12,
        borderRadius: BorderRadius.full, ...Shadow.md,
    },
    sosBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

    etaCard: {
        margin: Spacing.md,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: BorderRadius.xl,
        padding: Spacing.md, gap: Spacing.sm, ...Shadow.lg,
    },
    reconnectRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    reconnectText: { color: Colors.semantic.warning, fontWeight: '700', fontSize: 12 },
    disconnectText: { color: Colors.semantic.error, fontWeight: '700', fontSize: 12 },
    reconnectBtn: {
        borderWidth: 1.5, borderColor: Colors.semantic.error,
        borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 6,
    },
    reconnectBtnText: { color: Colors.semantic.error, fontWeight: '700', fontSize: 12 },

    etaRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    busEmoji: { fontSize: 32 },
    etaLabel: { color: Colors.text.secondary, fontSize: 13 },
    etaValue: { fontWeight: '900', fontSize: 22, color: Colors.brand.primary },
    nextStop: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },

    liveDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.neutral.gray300 },
    liveDotActive: { backgroundColor: Colors.semantic.success },

    pinOuter:      { alignItems: 'center', justifyContent: 'center' },
    pinEmoji:      { fontSize: 28 },
    busMarker:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    busMarkerText: { fontSize: 32 },

    loadingOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
    },
    loadingText: { color: Colors.text.secondary, fontWeight: '600' },
});
