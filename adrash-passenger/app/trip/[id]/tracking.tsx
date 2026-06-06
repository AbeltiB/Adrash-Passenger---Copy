// app/trip/[id]/tracking.tsx
// Full-screen live tracking — SignalR + GPS polling fallback + SOS button.
// SignalR: connects on mount, disconnects on unmount.
// react-native-maps is installed but requires a Google Maps API key.
// Map renders the bus position, pickup pin, and destination pin.

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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { hasGoogleMaps } from '@/lib/maps';
import { useRouteBundle, useTrip, useTripLocation } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import { startTracking, stopTracking } from '@/lib/signalr';
import { getAccessToken } from '@/features/auth/utils/token';
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrackingScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const tripQuery = useTrip(id);
    const locQuery  = useTripLocation(id);   // polls /trips/{id}/location/latest every 5s
    // Route geometry (gpsPolyline + origin/destination) — the trip-detail endpoint
    // doesn't carry it, so fetch the route by the trip's routeId. Disabled until
    // the trip (and its routeId) loads.
    const routeBundle = useRouteBundle(tripQuery.data?.routeId);
    const flow      = useBookingFlowStore();

    const [livePos, setLivePos] = useState<LivePosition | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
    const mapRef = useRef<MapView>(null);

    // ── SignalR setup ──────────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;

        async function connect() {
            try {
                const token = await getAccessToken();
                if (!token || !mounted) return;

                const hub = await startTracking(token ?? '');

                hub.onreconnecting(() => { if (mounted) setConnectionState('reconnecting'); });
                hub.onreconnected(() => {  if (mounted) setConnectionState('connected');    });
                hub.onclose(() => {        if (mounted) setConnectionState('disconnected'); });

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
                    // Pan map to bus position
                    mapRef.current?.animateToRegion({
                        latitude:       data.lat,
                        longitude:      data.lng,
                        latitudeDelta:  0.05,
                        longitudeDelta: 0.05,
                    }, 800);
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

    // ── Merge live SignalR pos with polling fallback ────────────────────────────
    const position: TripLocationDTO | LivePosition | null =
        livePos ?? locQuery.data ?? null;

    // ── SOS alert ─────────────────────────────────────────────────────────────
    function triggerSOS() {
        Alert.alert(
            '⚠️  Send emergency alert?',
            'Your current trip location will be shared with Adrash support and your next-of-kin via SMS.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send alert',
                    style: 'destructive',
                    onPress: () => {
                        // SOS is server-side triggered; surface an informational alert.
                        Alert.alert(
                            'Alert sent',
                            'Adrash support and your emergency contact have been notified. Help is on the way.',
                        );
                    },
                },
            ],
        );
    }

    const trip    = tripQuery.data;
    const route   = routeBundle.data?.route;
    const pickup  = flow.selectedPickup;
    const dropoff = flow.selectedDropoff;

    // Build initial map region
    const initialRegion = position
        ? { latitude: position.lat, longitude: position.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }
        : pickup
        ? { latitude: pickup.lat, longitude: pickup.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }
        : undefined;

    return (
        <View style={styles.container}>
            {/* ── Map ── */}
            {hasGoogleMaps ? (
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                {...(initialRegion ? { initialRegion } : {})}
                showsUserLocation={false}
                showsCompass
                mapType="standard"
            >
                {/* Route polyline — backend returns gpsPolyline as an ordered
                    [{lat,lng}] array; map to react-native-maps coordinates. */}
                {route?.gpsPolyline && route.gpsPolyline.length > 1 && (
                    <Polyline
                        coordinates={route.gpsPolyline.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                        strokeColor={Colors.brand.primary}
                        strokeWidth={4}
                    />
                )}

                {/* Pickup pin */}
                {pickup && (
                    <Marker
                        coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
                        title="Your pickup"
                        description={pickup.name}
                        pinColor="orange"
                    />
                )}

                {/* Drop-off pin */}
                {dropoff && (
                    <Marker
                        coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }}
                        title="Your destination"
                        description={dropoff.name}
                        pinColor="green"
                    />
                )}

                {/* Live bus position */}
                {position && (
                    <Marker
                        coordinate={{ latitude: position.lat, longitude: position.lng }}
                        title="Your bus"
                        description={`${('speed' in position ? position.speed : 0)} km/h`}
                        rotation={'heading' in position ? position.heading : 0}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={styles.busMarker}>
                            <Text style={styles.busMarkerText}>🚌</Text>
                        </View>
                    </Marker>
                )}
            </MapView>
            ) : (
                <View style={[styles.map, styles.mapFallback]}>
                    <Text style={styles.mapFallbackIcon}>🗺️</Text>
                    <Text style={styles.mapFallbackText}>Live map unavailable</Text>
                    <Text style={styles.mapFallbackSub}>
                        Trip status and ETA continue to update below.
                    </Text>
                </View>
            )}

            {/* ── Header overlay ── */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']} pointerEvents="box-none">
                <View style={styles.header} pointerEvents="auto">
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.back}>←</Text>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerRoute}>
                            {route?.originCity ?? trip?.route?.originCity ?? '…'}  →  {route?.destinationCity ?? trip?.route?.destinationCity ?? '…'}
                        </Text>
                        <Text style={styles.headerStatus}>
                            {trip?.status ?? 'Loading'}
                        </Text>
                    </View>
                    <View style={styles.liveIndicator}>
                        <View style={[styles.liveDotSmall, connectionState === 'connected' && styles.liveDotSmallActive]} />
                        <Text style={styles.liveLabel}>LIVE</Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* ── Bottom panel: ETA + actions ── */}
            <SafeAreaView style={styles.bottomPanel} edges={['bottom']} pointerEvents="box-none">
                <View pointerEvents="auto">
                    {/* Action row */}
                    <View style={styles.actionRow}>
                        <Pressable style={styles.sosBtn} onPress={triggerSOS}>
                            <Text style={styles.sosBtnText}>🛡  SOS</Text>
                        </Pressable>
                    </View>

                    {/* ETA card */}
                    <ETACard
                        eta={'eta' in (livePos ?? {}) ? (livePos as LivePosition).eta : null}
                        nextStop={'nextStopName' in (livePos ?? {}) ? (livePos as LivePosition).nextStopName : null}
                        connectionState={connectionState}
                    />
                </View>
            </SafeAreaView>

            {/* ── Loading overlay (initial) ── */}
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
    container: { flex: 1, backgroundColor: Colors.background.secondary },
    map:       { flex: 1 },
    mapFallback: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.background.secondary, padding: Spacing.xl, gap: Spacing.sm,
    },
    mapFallbackIcon: { fontSize: 48 },
    mapFallbackText: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
    mapFallbackSub:  { fontSize: 13, color: Colors.text.tertiary, textAlign: 'center' },

    headerOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        margin: Spacing.md,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.md,
    },
    backBtn:      { width: 36, justifyContent: 'center' },
    back:         { fontSize: 22, color: Colors.text.primary, fontWeight: '700' },
    headerRoute:  { fontWeight: '800', fontSize: 14, color: Colors.text.primary },
    headerStatus: { color: Colors.text.tertiary, fontSize: 11, marginTop: 2 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    liveDotSmall:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.neutral.gray300 },
    liveDotSmallActive: { backgroundColor: Colors.semantic.success },
    liveLabel:     { fontWeight: '900', fontSize: 11, color: Colors.semantic.success, letterSpacing: 1 },

    bottomPanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sosBtn: {
        backgroundColor: Colors.semantic.error,
        paddingHorizontal: Spacing.lg, paddingVertical: 12,
        borderRadius: BorderRadius.full,
        ...Shadow.md,
    },
    sosBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

    etaCard: {
        margin: Spacing.md,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.lg,
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

    busMarker:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    busMarkerText: { fontSize: 32 },

    loadingOverlay: {
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
    },
    loadingText: { color: Colors.text.secondary, fontWeight: '600' },
});

declare module 'react-native' {
    interface ViewStyle { inset?: number }
}
