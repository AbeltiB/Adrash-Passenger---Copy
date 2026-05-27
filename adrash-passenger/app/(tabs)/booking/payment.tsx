// app/(tabs)/booking/payment.tsx
// Payment method selection + payment initiation.
// Phase A: choose provider + enter account ref → tap Pay
// Phase B: waiting — automatic polling every 8 s, manual verify button, 5-min countdown

import { useState } from 'react';
import { router } from 'expo-router';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { useInitiatePayment } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import type { PaymentMethodDTO } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Provider metadata ────────────────────────────────────────────────────────

interface ProviderInfo {
    method: PaymentMethodDTO;
    label: string;
    description: string;
    badge?: string;
    emoji: string;
    instructions: string;
}

const PROVIDERS: ProviderInfo[] = [
    {
        method:       'Telebirr',
        label:        'Telebirr',
        description:  'Ethio Telecom mobile money',
        badge:        'Most popular',
        emoji:        '📱',
        instructions: 'Open your Telebirr app or check your phone for a payment prompt, then confirm.',
    },
    {
        method:       'CBE Birr',
        label:        'CBE Birr',
        description:  'Commercial Bank of Ethiopia',
        emoji:        '🏦',
        instructions: 'A USSD prompt will appear on your phone. Dial the code and enter your PIN.',
    },
    {
        method:       'HelloCash',
        label:        'HelloCash',
        description:  'Amhara Bank · Postal network',
        emoji:        '💳',
        instructions: 'Confirm via your HelloCash USSD menu or agent.',
    },
    {
        method:       'ADC',
        label:        'ADC',
        description:  'ADC Research and Development',
        emoji:        '🔷',
        instructions: 'Complete payment in your ADC account.',
    },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PaymentScreen() {
    const flow     = useBookingFlowStore();
    const initiate = useInitiatePayment();

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethodDTO | null>(
        flow.selectedPaymentMethod,
    );
    const [accountRef, setAccountRef] = useState(
        flow.passengerDetails[0]?.phone ?? '',
    );
    const [error, setError] = useState('');

    const selectedProvider = PROVIDERS.find((p) => p.method === selectedMethod);
    const totalEtb = flow.pendingBooking?.totalFare ?? 0;

    const canPay = Boolean(selectedMethod) && accountRef.trim().length >= 9 && !initiate.isPending;

    async function handlePay() {
        if (!flow.pendingBooking || !selectedMethod) return;
        setError('');

        try {
            const txn = await initiate.mutateAsync({
                bookingId:  flow.pendingBooking.id,
                method:     selectedMethod,
                accountRef: accountRef.trim(),
            });
            // Store method for use on waiting + confirmation screens
            flow.setPaymentMethod(selectedMethod);
            router.push({
                pathname: '/(tabs)/booking/waiting',
                params:   { transactionId: txn.transactionId },
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Payment initiation failed. Please try again.');
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Header ── */}
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.back}>←  Review order</Text>
                </Pressable>

                <Text style={styles.title}>How would you like to pay?</Text>

                {/* ── Total amount ── */}
                <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Total amount due</Text>
                    <Text style={styles.totalAmount}>ETB {totalEtb.toFixed(2)}</Text>
                    <Text style={styles.totalSub}>
                        {flow.selectedSeats.length} seat(s) ·{' '}
                        {flow.origin} → {flow.destination}
                    </Text>
                </View>

                {/* ── Provider cards ── */}
                <Text style={styles.sectionLabel}>Select payment method</Text>
                {PROVIDERS.map((p) => {
                    const active = selectedMethod === p.method;
                    return (
                        <Pressable
                            key={p.method}
                            style={[styles.providerCard, active && styles.providerCardActive]}
                            onPress={() => setSelectedMethod(p.method)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                        >
                            <View style={styles.providerLeft}>
                                <Text style={styles.providerEmoji}>{p.emoji}</Text>
                                <View>
                                    <View style={styles.providerTitleRow}>
                                        <Text style={styles.providerLabel}>{p.label}</Text>
                                        {p.badge && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>{p.badge}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.providerDesc}>{p.description}</Text>
                                </View>
                            </View>
                            <View style={[styles.radio, active && styles.radioActive]}>
                                {active && <View style={styles.radioInner} />}
                            </View>
                        </Pressable>
                    );
                })}

                {/* ── Account reference input ── */}
                {selectedMethod && (
                    <View style={styles.phoneBox}>
                        <Text style={styles.phoneLabel}>
                            Phone number registered with {selectedMethod}
                        </Text>
                        <TextInput
                            style={styles.phoneInput}
                            value={accountRef}
                            onChangeText={setAccountRef}
                            keyboardType="phone-pad"
                            placeholder="09XX XXX XXX"
                            placeholderTextColor={Colors.text.disabled}
                            maxLength={13}
                            accessibilityLabel="Payment account phone number"
                        />
                        <Text style={styles.phoneHint}>
                            Enter the phone number linked to your {selectedMethod} account
                        </Text>
                    </View>
                )}

                {/* ── Instructions ── */}
                {selectedProvider && (
                    <View style={styles.instructionBox}>
                        <Text style={styles.instructionIcon}>ℹ️</Text>
                        <Text style={styles.instructionText}>{selectedProvider.instructions}</Text>
                    </View>
                )}

                {/* ── Security note ── */}
                <View style={styles.securityNote}>
                    <Text style={styles.securityIcon}>🔒</Text>
                    <Text style={styles.securityText}>
                        No card or payment information is stored on your device.
                    </Text>
                </View>

                {/* ── Error ── */}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* ── Pay button ── */}
                <Pressable
                    style={[styles.payBtn, !canPay && styles.payBtnDisabled]}
                    onPress={() => void handlePay()}
                    disabled={!canPay}
                    accessibilityRole="button"
                    accessibilityLabel={`Pay ETB ${totalEtb.toFixed(2)}`}
                >
                    {initiate.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.payBtnText}>
                            Pay  ETB {totalEtb.toFixed(2)}
                        </Text>
                    )}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },
    content:   { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['2xl'] },

    backBtn: { marginBottom: Spacing.xs },
    back:    { color: Colors.brand.primary, fontWeight: '700', fontSize: 14 },

    title: { fontSize: 22, fontWeight: '800', color: Colors.text.primary },

    totalCard: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: 4,
        ...Shadow.md,
    },
    totalLabel:  { color: Colors.brand.onPrimary, fontSize: 12, fontWeight: '600' },
    totalAmount: { color: '#fff', fontSize: 36, fontWeight: '900' },
    totalSub:    { color: Colors.brand.onPrimary, fontSize: 12 },

    sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.text.tertiary, marginTop: Spacing.xs },

    providerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.border.light,
        ...Shadow.sm,
    },
    providerCardActive: {
        borderColor: Colors.brand.primary,
        backgroundColor: Colors.brand.primaryTint,
    },
    providerLeft:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    providerEmoji:    { fontSize: 28, width: 36, textAlign: 'center' },
    providerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    providerLabel:    { fontWeight: '800', fontSize: 15, color: Colors.text.primary },
    providerDesc:     { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },

    badge: {
        backgroundColor: Colors.semantic.success,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    radio: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: Colors.border.medium,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    radioActive: { borderColor: Colors.brand.primary },
    radioInner:  { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.brand.primary },

    phoneBox: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: 6,
        ...Shadow.sm,
    },
    phoneLabel: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
    phoneInput: {
        borderWidth: 1.5, borderColor: Colors.border.medium,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: 16, fontWeight: '600',
        color: Colors.text.primary,
        backgroundColor: Colors.background.primary,
    },
    phoneHint: { color: Colors.text.tertiary, fontSize: 12 },

    instructionBox: {
        flexDirection: 'row',
        gap: Spacing.sm,
        backgroundColor: Colors.semantic.infoLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    instructionIcon: { fontSize: 16, flexShrink: 0 },
    instructionText: { flex: 1, color: Colors.semantic.info, fontSize: 13, fontWeight: '500' },

    securityNote: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'center',
    },
    securityIcon: { fontSize: 14 },
    securityText: { flex: 1, color: Colors.text.tertiary, fontSize: 12 },

    errorText: {
        color: Colors.semantic.error,
        fontWeight: '700',
        textAlign: 'center',
        backgroundColor: Colors.semantic.errorLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },

    payBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    payBtnDisabled: { opacity: 0.4 },
    payBtnText:     { color: '#fff', fontWeight: '800', fontSize: 17 },
});
