// app/trips/[id]/cancel.tsx
// Cancel booking flow — shows refund policy, requires checkbox confirmation.
// APIs: GET /bookings/{id}/cancellation-info, POST /bookings/{id}/cancel

import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../src/constants';
import {
    useCancellationInfo,
    useBookingDetail,
    useCancelBooking,
} from '../../../src/features/passenger-booking/hooks/usePassengerBooking';

export default function CancelBookingScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [agreed, setAgreed] = useState(false);
    const [cancelled, setCancelled] = useState(false);

    const booking      = useBookingDetail(id);
    const cancelInfo   = useCancellationInfo(id);
    const cancelMut    = useCancelBooking();

    const info = cancelInfo.data;
    const bk   = booking.data;

    const isLoading = booking.isLoading || cancelInfo.isLoading;
    const isError   = booking.isError || cancelInfo.isError;

    async function confirmCancel() {
        if (!id || !agreed) return;
        await cancelMut.mutateAsync(id);
        setCancelled(true);
    }

    // ── Success state ──────────────────────────────────────────────────────────
    if (cancelled) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.successView}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successTitle}>Booking cancelled</Text>
                    <Text style={styles.successSub}>
                        {info?.refundAmountEtb && info.refundAmountEtb > 0
                            ? `A refund of ETB ${info.refundAmountEtb.toFixed(2)} has been initiated. It will appear within 3–5 business days.`
                            : 'Your booking has been cancelled. No refund applies based on the cancellation policy.'}
                    </Text>
                    <Pressable
                        style={styles.doneBtn}
                        onPress={() => {
                            router.replace('/(tabs)/my-trips');
                        }}
                    >
                        <Text style={styles.doneBtnText}>Go to My Trips</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // ── Loading / error ────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <SafeAreaView style={styles.centred} edges={['top']}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </SafeAreaView>
        );
    }

    if (isError) {
        return (
            <SafeAreaView style={styles.centred} edges={['top']}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>Could not load cancellation info</Text>
                <Pressable style={styles.retryBtn} onPress={() => {
                    void booking.refetch();
                    void cancelInfo.refetch();
                }}>
                    <Text style={styles.retryText}>Retry</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const route    = bk?.trip?.route;
    const depTime  = bk?.trip?.departureTime
        ? new Date(bk.trip.departureTime).toLocaleDateString('en-ET', {
              weekday: 'short', month: 'short', day: 'numeric',
          })
        : '—';
    const seats    = bk?.seatNumbers.join(', ') ?? '—';
    const totalPaid = bk?.totalFare ?? 0;

    const canCancel = info?.canCancel !== false;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.back}>←</Text>
                    </Pressable>
                    <Text style={styles.title}>Cancel booking</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* ── Trip summary ── */}
                <View style={styles.tripCard}>
                    <Text style={styles.tripRoute}>
                        {route?.originCity ?? 'Origin'}  →  {route?.destinationCity ?? 'Destination'}
                    </Text>
                    <Text style={styles.tripMeta}>
                        {depTime}  ·  Seat{bk && bk.seatNumbers.length > 1 ? 's' : ''} {seats}
                    </Text>
                    <Text style={styles.tripRef}>
                        Ref: {bk?.bookingReference ?? '—'}
                    </Text>
                </View>

                {/* ── Refund policy card ── */}
                <View style={styles.policyCard}>
                    <Text style={styles.policyTitle}>Cancellation policy</Text>

                    {!canCancel ? (
                        <View style={styles.noCancelBox}>
                            <Text style={styles.noCancelIcon}>🚫</Text>
                            <Text style={styles.noCancelText}>
                                This booking can no longer be cancelled. The departure is too close or it has already departed.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.refundRow}>
                                <View style={styles.refundItem}>
                                    <Text style={styles.refundLabel}>You paid</Text>
                                    <Text style={styles.refundValue}>
                                        ETB {totalPaid.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.refundDivider} />
                                <View style={styles.refundItem}>
                                    <Text style={styles.refundLabel}>Refund</Text>
                                    <Text style={[styles.refundValue, styles.refundAmount]}>
                                        ETB {(info?.refundAmountEtb ?? 0).toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.refundDivider} />
                                <View style={styles.refundItem}>
                                    <Text style={styles.refundLabel}>Refund %</Text>
                                    <Text style={[styles.refundValue, styles.refundPct]}>
                                        {info?.refundPercentage ?? 0}%
                                    </Text>
                                </View>
                            </View>

                            {info?.policy ? (
                                <Text style={styles.policyText}>{info.policy}</Text>
                            ) : null}

                            <Text style={styles.refundNote}>
                                💳  Refund will be returned to your original payment method within 3–5 business days.
                            </Text>
                        </>
                    )}
                </View>

                {/* ── Passengers list ── */}
                {bk?.passengerDetails && bk.passengerDetails.length > 0 && (
                    <View style={styles.passengersCard}>
                        <Text style={styles.passengersTitle}>Passengers being cancelled</Text>
                        {bk.passengerDetails.map((p, i) => (
                            <View key={i} style={[styles.passengerRow, i > 0 && styles.passengerDivider]}>
                                <Text style={styles.passengerName}>{p.fullName}</Text>
                                <Text style={styles.passengerSeat}>
                                    Seat {bk.seatNumbers[i] ?? '—'}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Checkbox confirmation ── */}
                {canCancel && (
                    <Pressable
                        style={styles.checkRow}
                        onPress={() => setAgreed((a) => !a)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: agreed }}
                    >
                        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                            {agreed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.checkLabel}>
                            I understand the refund policy and confirm I want to cancel this booking.
                        </Text>
                    </Pressable>
                )}

                {/* ── Error from mutation ── */}
                {cancelMut.isError && (
                    <View style={styles.mutErrorBox}>
                        <Text style={styles.mutErrorText}>
                            {cancelMut.error instanceof Error
                                ? cancelMut.error.message
                                : 'Cancellation failed. Please try again.'}
                        </Text>
                    </View>
                )}

                {/* ── Buttons ── */}
                <View style={styles.buttonRow}>
                    {canCancel && (
                        <Pressable
                            style={[styles.cancelBtn, (!agreed || cancelMut.isPending) && styles.cancelBtnDisabled]}
                            onPress={() => void confirmCancel()}
                            disabled={!agreed || cancelMut.isPending}
                        >
                            {cancelMut.isPending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.cancelBtnText}>Confirm cancellation</Text>
                            )}
                        </Pressable>
                    )}

                    <Pressable
                        style={styles.keepBtn}
                        onPress={() => router.back()}
                        disabled={cancelMut.isPending}
                    >
                        <Text style={styles.keepBtnText}>Keep my booking</Text>
                    </Pressable>
                </View>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },
    content:   { gap: Spacing.md, paddingBottom: Spacing['2xl'] },

    centred:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    errorIcon: { fontSize: 44 },
    errorText: { color: Colors.text.secondary, fontWeight: '600' },
    retryBtn:  { backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.xl, paddingVertical: 10, borderRadius: BorderRadius.lg },
    retryText: { color: '#fff', fontWeight: '700' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
        backgroundColor: Colors.background.primary,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    back:    { fontSize: 24, color: Colors.text.primary, fontWeight: '600' },
    title:   { fontSize: 17, fontWeight: '800', color: Colors.text.primary },

    tripCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: 4,
        ...Shadow.sm,
    },
    tripRoute: { fontSize: 17, fontWeight: '800', color: Colors.text.primary },
    tripMeta:  { color: Colors.text.secondary, fontSize: 13 },
    tripRef:   { fontFamily: 'monospace', color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },

    policyCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.sm,
    },
    policyTitle: { fontWeight: '800', color: Colors.text.primary, fontSize: 15 },

    noCancelBox: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    noCancelIcon: { fontSize: 18 },
    noCancelText: { flex: 1, color: Colors.semantic.error, fontWeight: '600', fontSize: 13 },

    refundRow:    { flexDirection: 'row', justifyContent: 'space-between' },
    refundItem:   { flex: 1, alignItems: 'center', gap: 2 },
    refundDivider: { width: 1, backgroundColor: Colors.border.light, marginHorizontal: Spacing.sm },
    refundLabel:  { color: Colors.text.tertiary, fontSize: 11, fontWeight: '600' },
    refundValue:  { fontWeight: '800', color: Colors.text.primary, fontSize: 16 },
    refundAmount: { color: Colors.semantic.success },
    refundPct:    { color: Colors.brand.primary },
    policyText:   { color: Colors.text.secondary, fontSize: 13 },
    refundNote:   { color: Colors.text.tertiary, fontSize: 12, fontStyle: 'italic' },

    passengersCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadow.sm,
    },
    passengersTitle:  { fontWeight: '800', color: Colors.text.primary, fontSize: 14, marginBottom: Spacing.sm },
    passengerRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
    passengerDivider: { borderTopWidth: 1, borderTopColor: Colors.border.light },
    passengerName:    { fontWeight: '600', color: Colors.text.primary, fontSize: 14 },
    passengerSeat:    { color: Colors.text.tertiary, fontSize: 13 },

    checkRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        gap: Spacing.md, marginHorizontal: Spacing.lg,
    },
    checkbox: {
        width: 24, height: 24, borderRadius: 6,
        borderWidth: 2, borderColor: Colors.border.medium,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
    },
    checkboxChecked: { borderColor: Colors.semantic.error, backgroundColor: Colors.semantic.errorLight },
    checkmark:       { color: Colors.semantic.error, fontWeight: '900', fontSize: 14 },
    checkLabel:      { flex: 1, color: Colors.text.secondary, fontSize: 14, lineHeight: 20 },

    mutErrorBox: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.semantic.errorLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    mutErrorText: { color: Colors.semantic.error, fontWeight: '600', fontSize: 13 },

    buttonRow: { marginHorizontal: Spacing.lg, gap: Spacing.sm },
    cancelBtn: {
        backgroundColor: Colors.semantic.error,
        borderRadius: BorderRadius.lg, paddingVertical: 16,
        alignItems: 'center',
    },
    cancelBtnDisabled: { opacity: 0.4 },
    cancelBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16 },

    keepBtn: {
        borderWidth: 1, borderColor: Colors.border.medium,
        borderRadius: BorderRadius.lg, paddingVertical: 15,
        alignItems: 'center',
    },
    keepBtnText: { color: Colors.text.primary, fontWeight: '700', fontSize: 15 },

    // Success state
    successView: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: Spacing.xl, gap: Spacing.md,
    },
    successIcon:  { fontSize: 64 },
    successTitle: { fontSize: 24, fontWeight: '900', color: Colors.text.primary, textAlign: 'center' },
    successSub:   { color: Colors.text.secondary, textAlign: 'center', fontSize: 14, lineHeight: 20 },
    doneBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg, paddingVertical: 16,
        paddingHorizontal: Spacing['2xl'],
        marginTop: Spacing.md,
    },
    doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
