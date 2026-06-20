// app/trip/[id]/tracking.tsx
// Full-screen live tracking — SignalR primary + GPS polling fallback + SOS.
// Uses MapLibre (no Google Maps API key required).

import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
// @ts-ignore — maplibre-react-native v11 has no default export; using legacy import for API compat
import MapLibreGL from '@maplibre/maplibre-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { useTrip, useTripLocation } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import { startTracking, stopTracking } from '@/lib/signalr';
import { getAccessToken } from '@/features/auth/utils/token';
import { MAP_STYLE_URL, MAP_AVAILABLE } from '@/lib/maps';
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
}: {
    eta: number | null;
    nextStop: string | null;
    connectionState: ConnectionState;
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
                    <Text style={styles.disconnectText}>⚠️  Connection lost — retrying</Text>
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
    const { id } = useLocalSearchParams<{ id: string }>();
    const tripQuery = useTrip(id);
    const locQuery  = useTripLocation(id);
    const flow      = useBookingFlowStore();

    const [livePos, setLivePos]               = useState<LivePosition | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
    const cameraRef = useRef<MapLibreGL.Camera>(null);

    // ── SignalR setup ──────────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;

        async function connect() {
            try {
                const token = await getAccessToken();
                if (!token || !mounted) return;

                const hub = await startTracking(token);

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
    }, [id]);

    // ── Animate camera to bus position on each live update ────────────────────
    useEffect(() => {
        if (!livePos) return;
        cameraRef.current?.setCamera({
            centerCoordinate: [livePos.lng, livePos.lat],
            zoomLevel: 14,
            animationDuration: 800,
        });
    }, [livePos]);

    // ── Merge live SignalR pos with polling fallback ───────────────────────────
    const position: TripLocationDTO | LivePosition | null = livePos ?? locQuery.data ?? null;

    // ── SOS ───────────────────────────────────────────────────────────────────
    function triggerSOS() {
        Alert.alert(
            '⚠️  Send emergency alert?',
            'Your current trip location will be shared with Adrash support and your next-of-kin via SMS.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send alert',
                    style: 'destructive',
                    onPress: () =>
                        Alert.alert(
                            'Alert sent',
                            'Adrash support and your emergency contact have been notified.',
                        ),
                },
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

    // Route polyline as GeoJSON LineString
    const routeGeoJSON = trip?.route?.polyline
        ? {
            type: 'Feature' as const,
            geometry: {
                type: 'LineString' as const,
                coordinates: decodePolyline(trip.route.polyline),
            },
            properties: {},
          }
        : null;

    return (
        <View style={styles.container}>
            {/* ── Map ── */}
            {MAP_AVAILABLE ? (
                <MapLibreGL.MapView
                    style={styles.map}
                    styleURL={MAP_STYLE_URL}
                    compassEnabled
                    attributionEnabled={false}
                    logoEnabled={false}
                >
                    <MapLibreGL.Camera
                        ref={cameraRef}
                        zoomLevel={13}
                        centerCoordinate={initialCoord}
                        animationMode="moveTo"
                        animationDuration={0}
                    />

                    {/* Route polyline */}
                    {routeGeoJSON && (
                        <MapLibreGL.ShapeSource id="route-src" shape={routeGeoJSON}>
                            <MapLibreGL.LineLayer
                                id="route-line"
                                style={{ lineColor: Colors.brand.primary, lineWidth: 4, lineOpacity: 0.85 }}
                            />
                        </MapLibreGL.ShapeSource>
                    )}

                    {/* Pickup marker */}
                    {pickup && (
                        <MapLibreGL.PointAnnotation
                            id="pickup"
                            coordinate={[pickup.lng, pickup.lat]}
                            title={pickup.name}
                        >
                            <View style={styles.pinOuter}>
                                <Text style={styles.pinEmoji}>📍</Text>
                            </View>
                        </MapLibreGL.PointAnnotation>
                    )}

                    {/* Destination marker */}
                    {dropoff && (
                        <MapLibreGL.PointAnnotation
                            id="dropoff"
                            coordinate={[dropoff.lng, dropoff.lat]}
                            title={dropoff.name}
                        >
                            <View style={styles.pinOuter}>
                                <Text style={styles.pinEmoji}>🏁</Text>
                            </View>
                        </MapLibreGL.PointAnnotation>
                    )}

                    {/* Live bus */}
                    {position && (
                        <MapLibreGL.PointAnnotation
                            id="bus"
                            coordinate={[position.lng, position.lat]}
                            title="Your bus"
                        >
                            <View style={styles.busMarker}>
                                <Text style={styles.busMarkerText}>🚌</Text>
                            </View>
                        </MapLibreGL.PointAnnotation>
                    )}
                </MapLibreGL.MapView>
            ) : (
                <View style={[styles.map, styles.mapUnavailable]} />
            )}

            {/* ── Header overlay ── */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']} pointerEvents="box-none">
                <View style={styles.header} pointerEvents="auto">
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.back}>←</Text>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerRoute}>
                            {trip?.route?.originCity ?? '…'}  →  {trip?.route?.destinationCity ?? '…'}
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
    mapUnavailable: { backgroundColor: Colors.background.secondary },

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
    reconnectRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    reconnectText: { color: Colors.semantic.warning, fontWeight: '700', fontSize: 12 },
    disconnectText: { color: Colors.semantic.error, fontWeight: '700', fontSize: 12 },

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
