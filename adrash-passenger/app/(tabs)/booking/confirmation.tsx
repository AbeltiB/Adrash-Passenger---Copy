// app/(tabs)/booking/confirmation.tsx
// Booking confirmed — success animation, QR ticket, action buttons.
// Called after payment polling returns status === 'Success'.

import { router } from 'expo-router';
import {
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

// ─── QR ticket display ────────────────────────────────────────────────────────

function QRDisplay({ data, bookingRef }: { data: string; bookingRef: string }) {
    return (
        <View style={styles.qrWrapper}>
            {/* Perforation effect */}
            <View style={styles.perforation} />

            <View style={styles.qrCard}>
                {/* Header */}
                <Text style={styles.qrBrand}>አድራሽ  ·  ADRASH</Text>

                <QRCode value={data} size={200} padding={12} />

                <Text style={styles.qrPrompt}>Show this to your driver</Text>

                <View style={styles.qrDivider} />

                <Text style={styles.qrRefLabel}>BOOKING REFERENCE</Text>
                <Text style={styles.qrRef}>{bookingRef}</Text>
            </View>

            <View style={styles.perforation} />
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ConfirmationScreen() {
    const flow = useBookingFlowStore();
    const storedBooking = flow.pendingBooking;

    // Re-fetch the booking to get the confirmed state (QR code, Confirmed status).
    // The waiting screen already updated pendingBooking, but this is a safety net
    // in case of any race condition.
    const { data: liveBooking } = useBookingDetail(storedBooking?.id);
    const booking = liveBooking ?? storedBooking;

    const qrData = booking?.qrCode ?? booking?.bookingReference ?? 'CONFIRMED';
    const bookingRef = booking?.bookingReference ?? '—';

    function done() {
        flow.resetFlow();
        router.replace('/(tabs)/my-trips');
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.inner}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* ── Success indicator ── */}
                <View style={styles.successCircle}>
                    <Text style={styles.checkmark}>✓</Text>
                </View>

                <Text style={styles.title}>Booking confirmed!</Text>
                <Text style={styles.subtitle}>
                    Your ticket is ready. Show the QR code to board your bus.
                </Text>

                {/* ── QR ticket ── */}
                <QRDisplay data={qrData} bookingRef={bookingRef} />

                {/* ── Trip summary ── */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Route</Text>
                        <Text style={styles.summaryValue}>
                            {flow.origin}  →  {flow.destination}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Pickup</Text>
                        <Text style={styles.summaryValue}>
                            {flow.selectedPickup?.name ?? '—'}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Drop-off</Text>
                        <Text style={styles.summaryValue}>
                            {flow.selectedDropoff?.name ?? '—'}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                            Seat{flow.selectedSeats.length > 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.summaryValue}>
                            {flow.selectedSeats.join(', ')}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    {(booking?.serviceFee ?? 0) > 0 && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Service fee</Text>
                                <Text style={styles.summaryValue}>
                                    ETB {(booking?.serviceFee ?? 0).toFixed(2)}
                                </Text>
                            </View>
                        </>
                    )}
                    {(booking?.rewardsDiscount ?? 0) > 0 && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Rewards discount</Text>
                                <Text style={[styles.summaryValue, { color: Colors.semantic.success }]}>
                                    −ETB {(booking?.rewardsDiscount ?? 0).toFixed(2)}
                                </Text>
                            </View>
                        </>
                    )}
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total paid</Text>
                        <Text style={[styles.summaryValue, styles.totalValue]}>
                            ETB {(booking?.totalFare ?? 0).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* ── Passengers ── */}
                {flow.passengerDetails.length > 0 && (
                    <View style={styles.passengersCard}>
                        <Text style={styles.passengersTitle}>Passengers</Text>
                        {flow.passengerDetails.map((p, i) => (
                            <View key={i} style={[styles.passengerRow, i > 0 && styles.passengerDivider]}>
                                <Text style={styles.passengerName}>
                                    {i + 1}.  {p.fullName}
                                </Text>
                                <Text style={styles.passengerSeat}>
                                    Seat {flow.selectedSeats[i] ?? '—'}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Done button ── */}
                <Pressable
                    style={styles.doneBtn}
                    onPress={done}
                    accessibilityRole="button"
                >
                    <Text style={styles.doneBtnText}>View my trips</Text>
                </Pressable>

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
    content:   { padding: Spacing.lg, gap: Spacing.md, alignItems: 'stretch' },

    successCircle: {
        alignSelf: 'center',
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.semantic.successLight,
        alignItems: 'center', justifyContent: 'center',
        marginTop: Spacing.md,
    },
    checkmark: { color: Colors.semantic.success, fontSize: 44, fontWeight: '900' },
    title:     { textAlign: 'center', fontSize: 26, fontWeight: '900', color: Colors.text.primary },
    subtitle:  { textAlign: 'center', color: Colors.text.tertiary, fontSize: 14 },

    // QR ticket
    qrWrapper: { gap: 0 },
    perforation: {
        height: 18,
        marginHorizontal: Spacing.md,
        borderTopWidth: 2,
        borderColor: Colors.border.light,
        borderStyle: 'dashed',
    },
    qrCard: {
        backgroundColor: Colors.background.primary,
        marginHorizontal: Spacing.xs,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
        ...Shadow.md,
    },
    qrBrand:    { fontWeight: '900', fontSize: 13, color: Colors.brand.primary, letterSpacing: 1 },
    qrPrompt:   { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
    qrDivider:  { width: '100%', height: 1, backgroundColor: Colors.border.light },
    qrRefLabel: { color: Colors.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    qrRef: {
        fontFamily: 'monospace',
        fontSize: 22, fontWeight: '900',
        color: Colors.brand.primary, letterSpacing: 2,
    },

    summaryCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadow.sm,
    },
    summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
    summaryLabel: { color: Colors.text.tertiary, fontSize: 13, fontWeight: '600' },
    summaryValue: { color: Colors.text.primary, fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: Spacing.md },
    totalValue:   { color: Colors.brand.primary, fontSize: 15, fontWeight: '900' },
    divider:      { height: 1, backgroundColor: Colors.border.light },

    passengersCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadow.sm,
    },
    passengersTitle: { fontWeight: '800', color: Colors.text.primary, fontSize: 14, marginBottom: Spacing.sm },
    passengerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
    passengerDivider: { borderTopWidth: 1, borderTopColor: Colors.border.light },
    passengerName: { color: Colors.text.primary, fontWeight: '600', fontSize: 14 },
    passengerSeat: { color: Colors.text.tertiary, fontSize: 13 },

    doneBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
