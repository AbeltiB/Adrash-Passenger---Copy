// app/(tabs)/trip/[id]/index.tsx
// Trip detail + ticket screen. Shown from My Trips → View ticket.
// APIs: GET /bookings/{id} (booking + trip + passenger details)

import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { useBookingDetail, useRouteBundle } from '@/features/passenger-booking/hooks/usePassengerBooking';
import type { BookingStatusDTO } from '@/features/passenger-booking/dtos/bookingDtos';
import { QRCode } from '@/components/QRCode';
import { saveTicketAsImage, saveTicketAsPDF, type TicketData } from '@/lib/ticketDownload';
import { formatDateTime, formatTime, formatDuration } from '@/utils/date';

// ─── QR display ────────────────────────────────────────────────────────────────

function QRDisplay({ data, bookingRef }: { data: string | null; bookingRef: string }) {
    return (
        <View style={styles.qrWrapper}>
            <View style={styles.perforation} />
            <View style={styles.qrCard}>
                <Text style={styles.qrBrand}>አድራሽ  ·  ADRASH</Text>
                {data ? (
                    <QRCode value={data} size={200} padding={12} />
                ) : (
                    <View style={styles.qrPendingBox}>
                        <Text style={styles.qrPendingText}>QR code not ready yet</Text>
                        <Text style={styles.qrPendingSub}>Pull to refresh, or check back shortly.</Text>
                    </View>
                )}
                <Text style={styles.qrPrompt}>Show this to your driver</Text>
                <View style={styles.qrDivider} />
                <Text style={styles.qrRefLabel}>BOOKING REFERENCE</Text>
                <Text style={styles.qrRef}>{bookingRef}</Text>
            </View>
            <View style={styles.perforation} />
        </View>
    );
}

// ─── Status progress bar ──────────────────────────────────────────────────────

const STATUS_STEPS: BookingStatusDTO[] = ['Confirmed', 'CheckedIn', 'Completed'];

function StatusBar({ status }: { status: BookingStatusDTO }) {
    const currentIdx = STATUS_STEPS.indexOf(status);
    const labels = ['Confirmed', 'Boarded', 'Completed'];

    return (
        <View style={styles.statusBar}>
            {STATUS_STEPS.map((s, i) => {
                const done   = i <= currentIdx;
                const active = i === currentIdx;
                return (
                    <View key={s} style={styles.statusStep}>
                        <View style={[styles.statusDot, done && styles.statusDotDone, active && styles.statusDotActive]}>
                            {done && <Text style={styles.statusCheck}>✓</Text>}
                        </View>
                        <Text style={[styles.statusLabel, done && styles.statusLabelDone]}>
                            {labels[i]}
                        </Text>
                        {i < STATUS_STEPS.length - 1 && (
                            <View style={[styles.statusLine, done && i < currentIdx && styles.statusLineDone]} />
                        )}
                    </View>
                );
            })}
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TripDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const query = useBookingDetail(id);
    const booking = query.data;

    const ticketRef = useRef<View>(null);
    const [downloading, setDownloading] = useState<'image' | 'pdf' | null>(null);

    // Called unconditionally (before the loading/error early returns below) so
    // hook order stays stable across renders — `enabled` inside the hook itself
    // handles the routeId-not-yet-known case safely.
    const routeBundle = useRouteBundle(booking?.trip?.routeId);

    if (query.isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
              <View style={styles.centred}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
              </View>
            </SafeAreaView>
        );
    }

    if (query.isError || !booking) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
              <View style={styles.centred}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>Could not load ticket</Text>
                <Pressable style={styles.retryBtn} onPress={() => void query.refetch()}>
                    <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            </SafeAreaView>
        );
    }

    const route = booking.trip?.route;
    const trip  = booking.trip;
    const driver = trip?.driver;
    const bus    = trip?.bus;

    function safeFmt(iso?: string | null, fn: (s: string) => string = formatDateTime): string {
        if (!iso) return '—';
        try { return fn(iso); } catch { return iso; }
    }

    const origin      = route?.originCity ?? '—';
    const destination = route?.destinationCity ?? '—';
    const depTime     = safeFmt(trip?.departureTime);
    const driverName  = driver?.fullName ?? driver?.name ?? null;
    const busLabel    = bus
        ? [bus.model, bus.plateNumber].filter(Boolean).join('  ·  ') || null
        : null;
    const seatsArr = booking.seatNumbers ?? [];
    const duration = (() => {
        const m = trip?.route?.estimatedDurationMin;
        if (!m || m <= 0) return '';
        try { return formatDuration(m); } catch { return ''; }
    })();

    // Must be the server-issued, HMAC-signed payload — never the plaintext
    // bookingReference, which is printed right below it on this same card and
    // could otherwise be used to forge a matching-looking (but unsigned) QR.
    const qrData       = booking.qrCode ?? null;
    const isInProgress = trip?.status === 'InProgress';
    const isCompleted  = booking.status === 'Completed';

    // The booking API only returns pickupLocationId (a raw id), never a
    // resolved name, and a route can have more than one pickup point — picking
    // "the first stop marked isPickup" showed the wrong one whenever a route
    // had multiple boarding points. Resolve the actual chosen id instead.
    const pickupName = booking.pickupLocation?.name
        ?? routeBundle.data?.pickups?.find((p) => p.id === booking.pickupLocationId)?.name
        ?? null;

    async function downloadImage() {
        if (!ticketRef.current) return;
        setDownloading('image');
        try { await saveTicketAsImage(ticketRef, origin, destination); }
        finally { setDownloading(null); }
    }

    async function downloadPDF() {
        if (!booking) return;
        setDownloading('pdf');
        const bk = booking;
        const data: TicketData = {
            bookingRef:      bk.bookingReference,
            origin,
            destination,
            departureTime:   depTime,
            arrivalEstimate: safeFmt(trip?.arrivalEstimate, formatTime),
            duration,
            driverName,
            busLabel,
            pickup:          pickupName ?? '—',
            dropoff:         bk.dropoffStop?.name ?? destination,
            seats:           seatsArr.join(', ') || '—',
            subtotal:        Math.max(0, (bk.totalFare ?? 0) - (bk.serviceFee ?? 0) + (bk.rewardsDiscount ?? 0)),
            serviceFee:      bk.serviceFee ?? 0,
            rewardsDiscount: bk.rewardsDiscount ?? 0,
            totalFare:       bk.totalFare ?? 0,
            passengers:      (bk.passengerDetails ?? []).map((p, i) => ({
                name:  p.fullName,
                phone: p.phone ?? '',
                seat:  String(seatsArr[i] ?? '—'),
            })),
            paymentMethod:   'Mobile Payment',
            purchasedAt:     safeFmt(bk.createdAt),
        };
        try { await saveTicketAsPDF(data); }
        finally { setDownloading(null); }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.inner}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.back}>←</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>My Ticket</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* ── Booking status progress ── */}
                {['Confirmed', 'CheckedIn', 'Completed'].includes(booking.status) && (
                    <StatusBar status={booking.status} />
                )}

                {/* ── QR ticket (capturable) ── */}
                <View ref={ticketRef} collapsable={false} style={styles.captureWrapper}>
                    <QRDisplay data={qrData} bookingRef={booking.bookingReference} />
                </View>

                {/* ── Download buttons ── */}
                <View style={styles.downloadRow}>
                    <Pressable
                        style={[styles.dlBtn, downloading === 'image' && styles.dlBtnDisabled]}
                        onPress={() => void downloadImage()}
                        disabled={downloading !== null}
                    >
                        {downloading === 'image'
                            ? <ActivityIndicator color={Colors.brand.primary} size="small" />
                            : <Text style={styles.dlBtnText}>⬇ Save as Image</Text>}
                    </Pressable>
                    <Pressable
                        style={[styles.dlBtn, downloading === 'pdf' && styles.dlBtnDisabled]}
                        onPress={() => void downloadPDF()}
                        disabled={downloading !== null}
                    >
                        {downloading === 'pdf'
                            ? <ActivityIndicator color={Colors.brand.primary} size="small" />
                            : <Text style={styles.dlBtnText}>⬇ Save as PDF</Text>}
                    </Pressable>
                </View>

                {/* ── Route + time ── */}
                <View style={styles.routeCard}>
                    <Text style={styles.routeTitle}>
                        {route?.originCity ?? 'Origin'}  →  {route?.destinationCity ?? 'Destination'}
                    </Text>
                    <Text style={styles.routeTime}>{depTime}</Text>

                    <View style={styles.routeDetails}>
                        <View style={styles.routeDetailItem}>
                            <Text style={styles.detailLabel}>Pickup</Text>
                            <Text style={styles.detailValue}>
                                {pickupName ?? '—'}
                            </Text>
                        </View>
                        <View style={styles.routeDetailItem}>
                            <Text style={styles.detailLabel}>
                                Seat{booking.seatNumbers.length > 1 ? 's' : ''}
                            </Text>
                            <Text style={styles.detailValue}>
                                {booking.seatNumbers.join(', ')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Driver info ── */}
                {driver && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoCardTitle}>Driver</Text>
                        <View style={styles.driverRow}>
                            <View style={styles.driverAvatar}>
                                <Text style={styles.driverAvatarText}>
                                    {(driver.fullName ?? driver.name ?? 'D')[0]?.toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.driverName}>
                                    {driver.fullName ?? driver.name ?? 'Assigned driver'}
                                </Text>
                                {driver.rating && (
                                    <Text style={styles.driverRating}>
                                        ★ {driver.rating.toFixed(1)}
                                        {driver.totalTrips ? `  ·  ${driver.totalTrips} trips` : ''}
                                    </Text>
                                )}
                            </View>
                            {driver.phone && (
                                <Pressable
                                    style={styles.callBtn}
                                    onPress={() => void Linking.openURL(`tel:${driver.phone}`)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Call driver ${driver.fullName ?? driver.name ?? ''}`}
                                >
                                    <Text style={styles.callBtnText}>📞  Call</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                )}

                {/* ── Bus info ── */}
                {bus && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoCardTitle}>Bus</Text>
                        <View style={styles.busRow}>
                            <View>
                                <Text style={styles.busModel}>{bus.model ?? 'Coach'}</Text>
                                {bus.plateNumber && (
                                    <Text style={styles.busPlate}>{bus.plateNumber}</Text>
                                )}
                            </View>
                            {bus.amenities && bus.amenities.length > 0 && (
                                <Text style={styles.amenities}>{bus.amenities.join('  ·  ')}</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* ── Payment summary ── */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoCardTitle}>Payment</Text>
                    <View style={styles.payRow}>
                        <Text style={styles.payLabel}>Total paid</Text>
                        <Text style={styles.payValue}>ETB {(booking.totalFare ?? 0).toFixed(2)}</Text>
                    </View>
                    {booking.rewardsDiscount && booking.rewardsDiscount > 0 ? (
                        <View style={styles.payRow}>
                            <Text style={styles.payLabel}>Rewards discount</Text>
                            <Text style={[styles.payValue, { color: Colors.semantic.success }]}>
                                -ETB {booking.rewardsDiscount.toFixed(2)}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* ── Passengers ── */}
                {booking.passengerDetails && booking.passengerDetails.length > 0 && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoCardTitle}>Passengers</Text>
                        {booking.passengerDetails.map((p, i) => (
                            <View key={i} style={[styles.passengerRow, i > 0 && styles.passengerDivider]}>
                                <Text style={styles.passengerName}>{p.fullName}</Text>
                                <Text style={styles.passengerPhone}>{p.phone}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Actions ── */}
                <View style={styles.actions}>
                    {isInProgress && (
                        <Pressable
                            style={styles.trackBtn}
                            onPress={() => router.push({
                                pathname: '/trip/[id]/tracking',
                                params: {
                                    id: booking.tripId,
                                    originCity: route?.originCity ?? '',
                                    destinationCity: route?.destinationCity ?? '',
                                },
                            })}
                        >
                            <Text style={styles.trackBtnText}>📍  Track my bus  (Live)</Text>
                        </Pressable>
                    )}

                    {isCompleted && !booking.hasReview && (
                        <Pressable
                            style={styles.reviewBtn}
                            onPress={() => router.push({ pathname: '/reviews/[bookingId]', params: { bookingId: booking.id } })}
                        >
                            <Text style={styles.reviewBtnText}>★  Rate this trip</Text>
                        </Pressable>
                    )}

                    {booking.status === 'Confirmed' && (
                        <Pressable
                            style={styles.cancelBtn}
                            onPress={() => router.push(`/trips/${booking.id}/cancel`)}
                        >
                            <Text style={styles.cancelBtnText}>Cancel booking</Text>
                        </Pressable>
                    )}

                </View>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
          </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.brand.primaryDark },
    inner:     { flex: 1, backgroundColor: Colors.background.secondary },
    content:   { gap: Spacing.md, paddingBottom: Spacing['2xl'] },

    captureWrapper: { backgroundColor: Colors.background.secondary },
    downloadRow:    { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
    dlBtn: {
        flex: 1, borderWidth: 1.5, borderColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg, paddingVertical: 11,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.brand.primaryTint, minHeight: 44,
    },
    dlBtnDisabled: { opacity: 0.5 },
    dlBtnText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 13 },

    centred:   { flex: 1, backgroundColor: Colors.background.secondary, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    errorIcon: { fontSize: 44 },
    errorText: { color: Colors.text.secondary, fontWeight: '600', fontSize: 15 },
    retryBtn:  { backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.xl, paddingVertical: 10, borderRadius: BorderRadius.lg },
    retryText: { color: '#fff', fontWeight: '700' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
        backgroundColor: Colors.background.primary,
    },
    backBtn:     { width: 36, height: 36, justifyContent: 'center' },
    back:        { fontSize: 24, color: Colors.text.primary, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text.primary },

    // Status bar
    statusBar: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        backgroundColor: Colors.background.primary,
    },
    statusStep:      { flex: 1, alignItems: 'center', position: 'relative' },
    statusDot: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 2, borderColor: Colors.border.medium,
        backgroundColor: Colors.background.secondary,
        alignItems: 'center', justifyContent: 'center',
    },
    statusDotDone:   { borderColor: Colors.semantic.success, backgroundColor: Colors.semantic.successLight },
    statusDotActive: { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primaryTint },
    statusCheck:     { color: Colors.semantic.success, fontWeight: '900', fontSize: 13 },
    statusLabel:     { color: Colors.text.tertiary, fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    statusLabelDone: { color: Colors.text.primary },
    statusLine: {
        position: 'absolute', top: 14, left: '60%', right: '-40%',
        height: 2, backgroundColor: Colors.border.medium,
    },
    statusLineDone: { backgroundColor: Colors.semantic.success },

    // QR ticket
    qrWrapper:    { marginHorizontal: Spacing.lg },
    perforation:  {
        height: 16, marginHorizontal: Spacing.md,
        borderTopWidth: 2, borderColor: Colors.border.medium, borderStyle: 'dashed',
    },
    qrCard:       { backgroundColor: Colors.background.primary, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, ...Shadow.md },
    qrBrand:      { fontWeight: '900', fontSize: 13, color: Colors.brand.primary, letterSpacing: 1 },
    qrPendingBox: {
        width: 200, height: 200, borderRadius: 12,
        borderWidth: 1.5, borderColor: Colors.border.medium, borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16,
    },
    qrPendingText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    qrPendingSub:  { color: Colors.text.tertiary, fontSize: 11, textAlign: 'center' },
    qrPrompt:     { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
    qrDivider:    { width: '100%', height: 1, backgroundColor: Colors.border.light },
    qrRefLabel:   { color: Colors.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    qrRef:        { fontFamily: 'monospace', fontSize: 20, fontWeight: '900', color: Colors.brand.primary, letterSpacing: 2 },

    // Cards
    routeCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm,
    },
    routeTitle:     { fontSize: 18, fontWeight: '900', color: Colors.text.primary },
    routeTime:      { color: Colors.text.secondary, fontSize: 13, marginTop: 4 },
    routeDetails:   { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
    routeDetailItem: { flex: 1 },
    detailLabel:    { color: Colors.text.tertiary, fontSize: 11, fontWeight: '700' },
    detailValue:    { color: Colors.text.primary, fontWeight: '700', fontSize: 14, marginTop: 2 },

    infoCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm,
    },
    infoCardTitle: { fontWeight: '800', color: Colors.text.primary, fontSize: 14 },

    driverRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    driverAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brand.primaryTint, alignItems: 'center', justifyContent: 'center' },
    driverAvatarText: { fontWeight: '900', fontSize: 18, color: Colors.brand.primary },
    driverName:       { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
    driverRating:     { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
    callBtn:          { backgroundColor: Colors.semantic.successLight, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md },
    callBtnText:      { color: Colors.semantic.success, fontWeight: '700', fontSize: 13 },

    busRow:    { gap: 4 },
    busModel:  { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
    busPlate:  { fontFamily: 'monospace', color: Colors.text.tertiary, fontSize: 12 },
    amenities: { color: Colors.text.secondary, fontSize: 12 },

    payRow:    { flexDirection: 'row', justifyContent: 'space-between' },
    payLabel:  { color: Colors.text.secondary, fontSize: 14 },
    payValue:  { fontWeight: '800', color: Colors.text.primary, fontSize: 14 },

    passengerRow:     { paddingVertical: Spacing.sm },
    passengerDivider: { borderTopWidth: 1, borderTopColor: Colors.border.light },
    passengerName:    { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
    passengerPhone:   { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },

    actions:  { marginHorizontal: Spacing.lg, gap: Spacing.sm },
    trackBtn: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 15, alignItems: 'center' },
    trackBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    reviewBtn: { backgroundColor: Colors.semantic.warningLight, borderRadius: BorderRadius.lg, paddingVertical: 15, alignItems: 'center' },
    reviewBtnText: { color: Colors.semantic.warning, fontWeight: '800', fontSize: 15 },
    cancelBtn: { borderWidth: 1.5, borderColor: Colors.semantic.error, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { color: Colors.semantic.error, fontWeight: '800', fontSize: 15 },
});
