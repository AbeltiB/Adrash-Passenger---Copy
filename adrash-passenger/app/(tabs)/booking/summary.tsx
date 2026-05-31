// app/(tabs)/booking/summary.tsx
// Final booking review: route details, fare breakdown, optional rewards redemption.
// Creates the booking on the server and advances to payment.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
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
import { useCreateBooking } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import { bookingService } from '@/features/passenger-booking/services/bookingService';
import { useRewardsBalance } from '../../../src/features/profile/hooks/useRewardsBalance';

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, bold && styles.fareLabelBold]}>{label}</Text>
            <Text style={[styles.fareValue, bold && styles.fareValueBold]}>{value}</Text>
        </View>
    );
}

export default function SummaryScreen() {
    const { t } = useTranslation();
    const f = useBookingFlowStore();
    const createBooking = useCreateBooking();
    const { data: balance } = useRewardsBalance();

    const [error, setError] = useState('');
    const [useRewards, setUseRewards] = useState(false);

    const maxEtbDiscount = balance?.etbEquivalent ?? 0;
    const pointsToRedeem = useRewards && maxEtbDiscount > 0
        ? Math.round(maxEtbDiscount)
        : 0;

    const fare = bookingService.calculateFare(
        f.selectedSeats.length,
        pointsToRedeem,
        f.selectedTrip?.fare,
    );

    async function handleCreateBooking() {
        setError('');

        const body = {
            tripId:            f.selectedTrip?.id ?? '',
            seatNumbers:       f.selectedSeats,
            pickupLocationId:  f.selectedPickup?.id ?? '',
            dropoffStopId:     f.selectedDropoff?.id ?? '',
            pointsToRedeem,
            passengerDetails:  f.passengerDetails,
        };

        const validationError = bookingService.validateBooking(body, f.selectedPickup, f.selectedDropoff);
        if (validationError) { setError(validationError); return; }

        try {
            const booking = await createBooking.mutateAsync(body);
            f.setPendingBooking(booking);
            f.setPoints(pointsToRedeem);
            router.push('/(tabs)/booking/payment');
        } catch (e) {
            setError(e instanceof Error ? e.message : t('errors.generic'));
        }
    }

    const departureDate = f.selectedTrip?.departureTime
        ? new Date(f.selectedTrip.departureTime).toLocaleString()
        : '—';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </Pressable>
                <Text style={styles.title}>{t('booking.summary.title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* ── Trip details ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {f.origin} → {f.destination}
                    </Text>
                    <Text style={styles.cardSub}>{departureDate}</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('booking.summary.seats')}</Text>
                        <Text style={styles.detailValue}>{f.selectedSeats.join(', ')}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('booking.pickup.title')}</Text>
                        <Text style={styles.detailValue}>{f.selectedPickup?.name ?? '—'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Drop-off</Text>
                        <Text style={styles.detailValue}>{f.selectedDropoff?.name ?? '—'}</Text>
                    </View>
                </View>

                {/* ── Rewards ── */}
                {maxEtbDiscount > 0 ? (
                    <Pressable
                        style={[styles.rewardsCard, useRewards && styles.rewardsCardActive]}
                        onPress={() => setUseRewards((v) => !v)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: useRewards }}
                    >
                        <View style={styles.rewardsLeft}>
                            <Text style={styles.rewardsIcon}>🎁</Text>
                            <View>
                                <Text style={styles.rewardsTitle}>{t('booking.summary.apply_points')}</Text>
                                <Text style={styles.rewardsSub}>
                                    {t('booking.summary.your_balance')}: ETB {maxEtbDiscount.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.toggle, useRewards && styles.toggleActive]}>
                            <View style={[styles.toggleKnob, useRewards && styles.toggleKnobActive]} />
                        </View>
                    </Pressable>
                ) : (
                    <View style={styles.noRewardsCard}>
                        <Text style={styles.noRewardsText}>🎁 {t('booking.summary.no_balance')}</Text>
                    </View>
                )}

                {/* ── Fare breakdown ── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{t('booking.summary.total')}</Text>
                    <Row label={t('booking.summary.subtotal')}   value={`ETB ${fare.subtotal}`} />
                    <Row label={t('booking.summary.service_fee')} value={`ETB ${fare.serviceFee}`} />
                    {useRewards && fare.rewardsDiscount > 0 && (
                        <Row
                            label={t('booking.summary.redeem_amount', { amount: fare.rewardsDiscount })}
                            value={`−ETB ${fare.rewardsDiscount}`}
                        />
                    )}
                    <View style={styles.totalDivider} />
                    <Row
                        label={t('booking.summary.total')}
                        value={`ETB ${fare.total}`}
                        bold
                    />
                </View>

                {/* ── Error ── */}
                {error ? <Text style={styles.error}>{error}</Text> : null}

                {/* ── CTA ── */}
                <Pressable
                    style={[styles.ctaBtn, createBooking.isPending && styles.ctaDisabled]}
                    onPress={() => void handleCreateBooking()}
                    disabled={createBooking.isPending}
                    accessibilityRole="button"
                >
                    {createBooking.isPending ? (
                        <ActivityIndicator color={Colors.neutral.white} />
                    ) : (
                        <Text style={styles.ctaBtnText}>{t('booking.summary.create_booking')}</Text>
                    )}
                </Pressable>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: Colors.background.secondary },
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
    backBtn:  { padding: 4 },
    backText: { fontSize: 22, color: Colors.text.primary, fontWeight: '600' },
    title:    { fontSize: 20, fontWeight: '900', color: Colors.text.primary },
    content:  { padding: Spacing.lg, gap: Spacing.md },

    card: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        gap: Spacing.sm,
        ...Shadow.sm,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
    cardSub:   { fontSize: 13, color: Colors.text.tertiary, marginTop: -Spacing.xs },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    detailLabel: { fontSize: 13, color: Colors.text.tertiary, flex: 1 },
    detailValue: { fontSize: 13, color: Colors.text.primary, fontWeight: '600', textAlign: 'right', flex: 1 },

    // Rewards toggle card
    rewardsCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: Colors.border.light,
        ...Shadow.sm,
    },
    rewardsCardActive: {
        borderColor: Colors.brand.primary,
        backgroundColor: Colors.brand.primaryTint,
    },
    rewardsLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    rewardsIcon:  { fontSize: 24 },
    rewardsTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
    rewardsSub:   { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },

    // Toggle switch
    toggle: {
        width: 44, height: 24, borderRadius: 12,
        backgroundColor: Colors.neutral.gray300,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    toggleActive:     { backgroundColor: Colors.brand.primary },
    toggleKnob: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: Colors.neutral.white,
        ...Shadow.sm,
        alignSelf: 'flex-start',
    },
    toggleKnobActive: { alignSelf: 'flex-end' },

    noRewardsCard: {
        backgroundColor: Colors.background.tertiary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    noRewardsText: { color: Colors.text.tertiary, fontSize: 13 },

    // Fare rows
    fareRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fareLabel:     { fontSize: 14, color: Colors.text.secondary },
    fareLabelBold: { fontWeight: '800', color: Colors.text.primary, fontSize: 16 },
    fareValue:     { fontSize: 14, color: Colors.text.primary },
    fareValueBold: { fontWeight: '800', color: Colors.brand.primary, fontSize: 18 },
    totalDivider:  { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.xs },

    error: { color: Colors.semantic.error, fontWeight: '700', textAlign: 'center' },
    ctaBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        ...Shadow.sm,
    },
    ctaDisabled:   { opacity: 0.5 },
    ctaBtnText:    { color: Colors.neutral.white, fontWeight: '800', fontSize: 16 },
});
