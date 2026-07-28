// app/(tabs)/booking/confirmation.tsx
// Booking confirmed — one full receipt PER PASSENGER, each independently
// downloadable/shareable. Confirmed with the backend team: every passenger
// on a booking has their own individually-verifiable boarding QR (not one
// QR shared across the whole booking), since a group can split up and board
// at different pickup points. Payment stays a single shared transaction —
// only the boarding pass is per-person.

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import type { RefObject } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { useBookingDetail } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import { QRCode } from '@/components/QRCode';
import {
    saveTicketAsImage,
    saveTicketAsPDF,
    type TicketData,
} from '@/lib/ticketDownload';
import { formatDateTimeForLang, formatEthiopianDateTime } from '@/utils/date';
import { SANTIMPAY_PARTNERS } from '@/features/passenger-booking/services/paymentService';

// ── Formatting helpers ────────────────────────────────────────────────────────

function safeFormatDateTime(iso: string | null | undefined, lang: string): string {
    if (!iso) return '—';
    try { return formatDateTimeForLang(iso, lang); } catch { return iso; }
}

function safeFormatEthiopian(iso: string | null | undefined): string {
    if (!iso) return '—';
    try { return formatEthiopianDateTime(iso); } catch { return iso; }
}

function safePurchaseDate(iso: string | null | undefined, lang: string): string {
    if (!iso) return new Date().toLocaleString();
    try { return formatDateTimeForLang(iso, lang); } catch { return iso; }
}

// ── InfoRow helper ────────────────────────────────────────────────────────────

function InfoRow({ label, value, valueStyle }: {
    label: string;
    value: string;
    valueStyle?: object;
}) {
    if (!value || value === '—') return null;
    return (
        <View style={rowStyles.row}>
            <Text style={rowStyles.label}>{label}</Text>
            <Text style={[rowStyles.value, valueStyle]}>{value}</Text>
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7,
             borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    label: { color: '#6B7280', fontSize: 13, fontWeight: '600', flexShrink: 0, marginRight: 12 },
    value: { color: '#111827', fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1 },
});

// ── Receipt card (full, capturable) — ONE passenger's own boarding pass ──────

interface ReceiptCardProps {
    bookingRef:         string;
    qrData:             string | null;
    passengerName:      string;
    passengerIndex:     number;
    passengerCount:     number;
    seat:               string;
    origin:             string;
    destination:        string;
    departureTime:      string;
    departureEthiopian: string;
    driverName:         string | null;
    busLabel:           string | null;
    pickup:             string;
    dropoff:            string;
    subtotal:           number;
    serviceFee:         number;
    rewardsDiscount:    number;
    totalFare:          number;
    paymentMethod:      string;
    purchasedAt:        string;
}

function ReceiptCard(p: ReceiptCardProps) {
    const isGroup = p.passengerCount > 1;

    return (
        <View style={rcStyles.card}>
            {/* Brand header */}
            <View style={rcStyles.header}>
                <Text style={rcStyles.brand}>ADRASH</Text>
                <Text style={rcStyles.brandAm}>አድራሽ</Text>
                <Text style={rcStyles.headerSub}>Official Travel Receipt</Text>
                <View style={rcStyles.badge}>
                    <Text style={rcStyles.badgeText}>✓  BOOKING CONFIRMED</Text>
                </View>
                {isGroup && (
                    <View style={rcStyles.groupBadge}>
                        <Text style={rcStyles.groupBadgeText}>
                            Passenger {p.passengerIndex} of {p.passengerCount}
                        </Text>
                    </View>
                )}
            </View>

            {/* Ref + purchase date */}
            <View style={rcStyles.refBar}>
                <View>
                    <Text style={rcStyles.refLabel}>BOOKING REFERENCE</Text>
                    <Text style={rcStyles.refValue}>{p.bookingRef}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={rcStyles.purchLabel}>PURCHASED</Text>
                    <Text style={rcStyles.purchValue}>{p.purchasedAt}</Text>
                </View>
            </View>

            {/* Route */}
            <View style={rcStyles.routeBar}>
                <Text style={rcStyles.routeText}>{p.origin}  →  {p.destination}</Text>
            </View>

            {/* This passenger + seat */}
            <View style={rcStyles.passengerBar}>
                <Text style={rcStyles.passengerName}>{p.passengerName}</Text>
                <Text style={rcStyles.passengerSeat}>Seat {p.seat}</Text>
            </View>

            {/* QR code — only ever this passenger's own server-issued,
                HMAC-signed payload, never a fallback built from the booking
                reference printed above (forgeable) or another passenger's
                QR (would board the wrong person). */}
            <View style={rcStyles.qrSection}>
                {p.qrData ? (
                    <>
                        <QRCode value={p.qrData} size={180} padding={10} />
                        <Text style={rcStyles.qrPrompt}>This passenger's own boarding pass — show at boarding</Text>
                    </>
                ) : (
                    <View style={rcStyles.qrPending}>
                        <Text style={rcStyles.qrPendingText}>QR code not ready yet</Text>
                        <Text style={rcStyles.qrPendingSub}>Pull to refresh, or check My Trips shortly.</Text>
                    </View>
                )}
            </View>

            <View style={rcStyles.dashed} />

            {/* Trip details */}
            <View style={rcStyles.section}>
                <Text style={rcStyles.secTitle}>TRIP DETAILS</Text>
                <InfoRow label="Departure"            value={p.departureTime} />
                <InfoRow label="Departure (Ethiopian)" value={p.departureEthiopian} />
                {p.driverName ? <InfoRow label="Driver"  value={p.driverName} /> : null}
                {p.busLabel   ? <InfoRow label="Vehicle" value={p.busLabel}   /> : null}
            </View>

            {/* Boarding */}
            <View style={rcStyles.section}>
                <Text style={rcStyles.secTitle}>BOARDING</Text>
                <InfoRow label="Pickup point" value={p.pickup}  />
                <InfoRow label="Drop-off"     value={p.dropoff} />
            </View>

            {/* Fare — shared across the whole booking, paid as one transaction */}
            <View style={rcStyles.section}>
                <Text style={rcStyles.secTitle}>
                    {isGroup ? `FARE BREAKDOWN — GROUP TOTAL (${p.passengerCount} PASSENGERS)` : 'FARE BREAKDOWN'}
                </Text>
                {p.subtotal > 0 && (
                    <InfoRow
                        label={`Fare (${p.passengerCount} seat${p.passengerCount !== 1 ? 's' : ''})`}
                        value={`ETB ${p.subtotal.toFixed(2)}`}
                    />
                )}
                {p.serviceFee > 0 && (
                    <InfoRow label="Service fee" value={`ETB ${p.serviceFee.toFixed(2)}`} />
                )}
                {p.rewardsDiscount > 0 && (
                    <View style={[rowStyles.row, { borderBottomWidth: 0 }]}>
                        <Text style={rowStyles.label}>Rewards discount</Text>
                        <Text style={[rowStyles.value, { color: Colors.semantic.success }]}>
                            −ETB {p.rewardsDiscount.toFixed(2)}
                        </Text>
                    </View>
                )}
                <View style={rcStyles.totalRow}>
                    <Text style={rcStyles.totalLabel}>{isGroup ? 'TOTAL PAID (WHOLE GROUP)' : 'TOTAL PAID'}</Text>
                    <Text style={rcStyles.totalValue}>ETB {p.totalFare.toFixed(2)}</Text>
                </View>
                {isGroup && <InfoRow label="Paid together as" value="One transaction" />}
            </View>

            {/* Payment */}
            <View style={[rcStyles.section, { borderBottomWidth: 0 }]}>
                <Text style={rcStyles.secTitle}>PAYMENT</Text>
                <InfoRow label="Method" value={p.paymentMethod} />
                <View style={[rowStyles.row, { borderBottomWidth: 0 }]}>
                    <Text style={rowStyles.label}>Status</Text>
                    <Text style={[rowStyles.value, { color: Colors.semantic.success }]}>✓ Confirmed</Text>
                </View>
            </View>

            {/* Footer */}
            <View style={rcStyles.footer}>
                <Text style={rcStyles.footerText}>
                    This is {p.passengerName}'s official Adrash digital travel receipt.{'\n'}
                    Present this QR code or the booking reference when boarding.
                </Text>
                <Text style={rcStyles.footerBrand}>ADRASH  ·  አድራሽ  ·  adrash.et</Text>
            </View>
        </View>
    );
}

const BLUE = '#0C3A5C'; // Colors.brand.primaryDark — matches the rest of the app's brand
const rcStyles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...Shadow.md },

    header: {
        backgroundColor: BLUE,
        paddingVertical: 22, paddingHorizontal: 24,
        alignItems: 'center', gap: 4,
    },
    brand:     { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 3 },
    brandAm:   { color: 'rgba(255,255,255,0.75)', fontSize: 14, letterSpacing: 1 },
    headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 0.8,
                 textTransform: 'uppercase', marginTop: 2 },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 24, paddingVertical: 5, paddingHorizontal: 18, marginTop: 10,
    },
    badgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    groupBadge: {
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderRadius: 24, paddingVertical: 4, paddingHorizontal: 14, marginTop: 8,
    },
    groupBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    refBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#E8F2FA', paddingVertical: 13, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#CFE3F2',
    },
    refLabel:  { color: BLUE, fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
                 textTransform: 'uppercase' },
    refValue:  { color: BLUE, fontSize: 19, fontWeight: '900', fontFamily: 'monospace',
                 letterSpacing: 2, marginTop: 2 },
    purchLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 1,
                  textTransform: 'uppercase' },
    purchValue: { color: '#374151', fontSize: 12, fontWeight: '600', marginTop: 2 },

    routeBar: {
        backgroundColor: '#F4F8FB', paddingVertical: 16, paddingHorizontal: 20,
        alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E1EDF5',
    },
    routeText: { color: BLUE, fontSize: 18, fontWeight: '900' },

    passengerBar: {
        paddingVertical: 12, paddingHorizontal: 20,
        alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
        backgroundColor: '#fff',
    },
    passengerName: { color: '#111827', fontSize: 16, fontWeight: '800' },
    passengerSeat: { color: BLUE, fontSize: 12, fontWeight: '700', marginTop: 2 },

    qrSection: {
        paddingVertical: 20, alignItems: 'center', gap: 10,
        backgroundColor: '#fff',
    },
    qrPrompt: { color: '#6B7280', fontSize: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },
    qrPending: {
        width: 180, height: 180, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16,
    },
    qrPendingText: { color: '#6B7280', fontSize: 13, fontWeight: '700', textAlign: 'center' },
    qrPendingSub:  { color: '#9CA3AF', fontSize: 11, textAlign: 'center' },

    dashed: {
        marginHorizontal: 16, borderTopWidth: 2,
        borderColor: '#E5E7EB', borderStyle: 'dashed',
    },

    section: {
        paddingVertical: 12, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    secTitle: {
        color: '#9CA3AF', fontSize: 10, fontWeight: '700',
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
    },

    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 10, paddingTop: 10,
        borderTopWidth: 2, borderTopColor: BLUE,
    },
    totalLabel: { fontSize: 14, fontWeight: '800', color: '#111827', letterSpacing: 0.3 },
    totalValue: { fontSize: 20, fontWeight: '900', color: BLUE },

    footer: {
        backgroundColor: '#F9FAFB', paddingVertical: 14, paddingHorizontal: 20,
        alignItems: 'center', gap: 6,
    },
    footerText:  { color: '#9CA3AF', fontSize: 11, textAlign: 'center', lineHeight: 17 },
    footerBrand: { color: BLUE, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

type DownloadState = { index: number; kind: 'image' | 'pdf' } | null;

export default function ConfirmationScreen() {
    const { i18n }       = useTranslation();
    const lang           = i18n.language ?? 'en';
    const flow          = useBookingFlowStore();
    const storedBooking = flow.pendingBooking;
    const { data: liveBooking } = useBookingDetail(storedBooking?.id);
    const booking = liveBooking ?? storedBooking;

    const bookingRef  = booking?.bookingReference ?? '—';
    const origin      = flow.origin || booking?.trip?.route?.originCity || '—';
    const destination = flow.destination || booking?.trip?.route?.destinationCity || '—';

    const trip    = booking?.trip;
    const driver  = trip?.driver;
    const bus     = trip?.bus;

    const driverName = driver?.fullName ?? driver?.name ?? null;
    const busLabel   = bus
        ? [bus.model, bus.plateNumber].filter(Boolean).join('  ·  ') || null
        : null;

    const pickup  = booking?.pickupLocation?.name ?? flow.selectedPickup?.name ?? '—';
    const dropoff = booking?.dropoffStop?.name ?? flow.selectedDropoff?.name ?? '—';

    const seatsArr = booking?.seatNumbers?.length ? booking.seatNumbers : flow.selectedSeats;

    const subtotal        = Math.max(0, (booking?.totalFare ?? 0) - (booking?.serviceFee ?? 0) + (booking?.rewardsDiscount ?? 0));
    const serviceFee      = booking?.serviceFee     ?? 0;
    const rewardsDiscount = booking?.rewardsDiscount ?? 0;
    const totalFare       = booking?.totalFare ?? 0;

    // 'SantimPay' is the aggregator that routed the charge, not something a
    // passenger would recognize — show the downstream rail they actually paid
    // through (Telebirr / CBE Birr / M-Pesa) instead.
    const partnerInfo   = SANTIMPAY_PARTNERS.find((p) => p.partner === flow.selectedSantimPayPartner);
    const paymentMethod = partnerInfo?.label ?? flow.selectedPaymentMethod ?? 'Mobile Payment';
    const purchasedAt   = safePurchaseDate(booking?.createdAt, lang);

    const departureTime      = safeFormatDateTime(trip?.departureTime, lang);
    const departureEthiopian = safeFormatEthiopian(trip?.departureTime);

    // Each passenger already carries their own qrCode/seatNumber once the
    // booking is Confirmed (see mapBooking); before that (or if the live
    // query hasn't resolved yet), fall back to the flow store's own
    // passenger list from just before submission, which has neither field
    // yet — the "QR not ready" state on each card handles that gracefully.
    const paxRaw = booking?.passengerDetails?.length ? booking.passengerDetails : flow.passengerDetails;
    const passengerCount = paxRaw.length;

    const receipts: ReceiptCardProps[] = paxRaw.map((p, i) => ({
        bookingRef,
        qrData: p.qrCode ?? null,
        passengerName: p.fullName || `Passenger ${i + 1}`,
        passengerIndex: i + 1,
        passengerCount,
        seat: String(p.seatNumber ?? seatsArr[i] ?? '—'),
        origin,
        destination,
        departureTime,
        departureEthiopian,
        driverName,
        busLabel,
        pickup,
        dropoff,
        subtotal,
        serviceFee,
        rewardsDiscount,
        totalFare,
        paymentMethod,
        purchasedAt,
    }));

    const ticketRefs = useRef<(View | null)[]>([]);
    const [downloading, setDownloading] = useState<DownloadState>(null);

    function done() {
        flow.resetFlow();
        router.replace('/(tabs)/my-trips');
    }

    async function downloadImage(index: number) {
        const node = ticketRefs.current[index];
        if (!node) return;
        setDownloading({ index, kind: 'image' });
        try {
            await saveTicketAsImage(
                { current: node } as RefObject<View>,
                bookingRef,
                receipts[index]?.passengerName ?? '',
                origin,
                destination,
            );
        } finally {
            setDownloading(null);
        }
    }

    async function downloadPDF(index: number) {
        const r = receipts[index];
        if (!r) return;
        setDownloading({ index, kind: 'pdf' });
        const data: TicketData = {
            bookingRef,
            passengerName:      r.passengerName,
            passengerIndex:     r.passengerIndex,
            passengerCount:     r.passengerCount,
            seat:               r.seat,
            qrCode:             r.qrData,
            origin,
            destination,
            departureTime,
            departureEthiopian,
            driverName,
            busLabel,
            pickup,
            dropoff,
            subtotal,
            serviceFee,
            rewardsDiscount,
            totalFare,
            paymentMethod,
            purchasedAt,
        };
        try {
            await saveTicketAsPDF(data);
        } finally {
            setDownloading(null);
        }
    }

    // This screen must never claim a booking is confirmed unless the server
    // says so. waiting.tsx already checks this before navigating here, but
    // this screen is also reachable by back-navigation or a stale deep link,
    // so it re-checks independently rather than trusting how it was reached.
    const nonConfirmedStatus = booking?.status && booking.status !== 'Confirmed'
        && booking.status !== 'CheckedIn' && booking.status !== 'Completed'
        ? booking.status
        : null;

    if (nonConfirmedStatus) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.inner}>
                    <View style={[styles.content, { flex: 1, justifyContent: 'center' }]}>
                        <View style={[styles.successCircle, { backgroundColor: Colors.semantic.errorLight }]}>
                            <Text style={[styles.checkmark, { color: Colors.semantic.error }]}>!</Text>
                        </View>
                        <Text style={styles.title}>Not confirmed yet</Text>
                        <Text style={styles.subtitle}>
                            {nonConfirmedStatus === 'Cancelled'
                                ? 'This booking was cancelled, so no ticket is available.'
                                : "We couldn't confirm this booking's payment. Check its status in My Trips before boarding."}
                        </Text>
                        <Pressable
                            style={styles.doneBtn}
                            onPress={() => router.replace('/(tabs)/my-trips')}
                            accessibilityRole="button"
                        >
                            <Text style={styles.doneBtnText}>View My Trips</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.inner}>
                <ScrollView contentContainerStyle={styles.content}>

                    {/* ── Success indicator (not captured) ── */}
                    <View style={styles.successCircle}>
                        <Text style={styles.checkmark}>✓</Text>
                    </View>
                    <Text style={styles.title}>Booking Confirmed!</Text>
                    <Text style={styles.subtitle}>
                        {passengerCount > 1
                            ? `${passengerCount} tickets are ready — each passenger has their own QR code below.`
                            : 'Your ticket is ready. Show the QR code to board your bus.'}
                    </Text>

                    {/* ── One full receipt per passenger, each independently
                          downloadable — a group can split up and board at
                          different pickup points, so each person needs their
                          own boarding pass, not one shared QR. ── */}
                    {receipts.map((receipt, i) => {
                        const isDownloadingThis = (kind: 'image' | 'pdf') =>
                            downloading?.index === i && downloading.kind === kind;

                        return (
                            <View key={`${receipt.passengerName}-${i}`} style={styles.receiptBlock}>
                                <View
                                    ref={(r) => { ticketRefs.current[i] = r; }}
                                    collapsable={false}
                                >
                                    <ReceiptCard {...receipt} />
                                </View>

                                <View style={styles.downloadRow}>
                                    <Pressable
                                        style={[styles.dlBtn, isDownloadingThis('image') && styles.dlBtnDisabled]}
                                        onPress={() => void downloadImage(i)}
                                        disabled={downloading !== null}
                                    >
                                        {isDownloadingThis('image')
                                            ? <ActivityIndicator color={Colors.brand.primary} size="small" />
                                            : <Text style={styles.dlBtnText}>⬇  Save as Image</Text>
                                        }
                                    </Pressable>
                                    <Pressable
                                        style={[styles.dlBtn, isDownloadingThis('pdf') && styles.dlBtnDisabled]}
                                        onPress={() => void downloadPDF(i)}
                                        disabled={downloading !== null}
                                    >
                                        {isDownloadingThis('pdf')
                                            ? <ActivityIndicator color={Colors.brand.primary} size="small" />
                                            : <Text style={styles.dlBtnText}>⬇  Save as PDF</Text>
                                        }
                                    </Pressable>
                                </View>
                            </View>
                        );
                    })}

                    {/* ── Done button ── */}
                    <Pressable
                        style={styles.doneBtn}
                        onPress={done}
                        accessibilityRole="button"
                    >
                        <Text style={styles.doneBtnText}>View My Trips</Text>
                    </Pressable>

                    <View style={{ height: Spacing.xl }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.brand.primaryDark },
    inner:     { flex: 1, backgroundColor: Colors.background.secondary },
    content:   { padding: Spacing.lg, gap: Spacing.md },

    successCircle: {
        alignSelf: 'center',
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.semantic.successLight,
        alignItems: 'center', justifyContent: 'center',
        marginTop: Spacing.md,
    },
    checkmark: { color: Colors.semantic.success, fontSize: 44, fontWeight: '900' },
    title:     { textAlign: 'center', fontSize: 26, fontWeight: '900', color: Colors.text.primary },
    subtitle:  { textAlign: 'center', color: Colors.text.tertiary, fontSize: 14, lineHeight: 20 },

    receiptBlock: { gap: Spacing.sm },

    downloadRow: { flexDirection: 'row', gap: Spacing.sm },
    dlBtn: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.brand.primaryTint,
        minHeight: 46,
    },
    dlBtnDisabled: { opacity: 0.5 },
    dlBtnText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 13 },

    doneBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
