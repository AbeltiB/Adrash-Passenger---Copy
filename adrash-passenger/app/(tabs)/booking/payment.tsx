// app/(tabs)/booking/payment.tsx
//
// Payment is always routed through SantimPay (Ethiopian aggregator).
// The user picks which downstream rail (Telebirr / CBE Birr / M-Pesa) via the
// optional `santimPayPartner` hint field — SantimPay handles the actual routing.
//
// Error handling covers the cases documented in the payment flow spec:
//   409 Payment.AlreadyInProgress  → skip to waiting screen (use existing txn)
//   503 Payment.ProviderDisabled   → kill switch message
//   503 Payment.ProviderUnavailable / 400 Payment.ProviderError → provider message

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import axios from 'axios';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
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
import { uuidv4 } from '@/lib/id';
import {
    SANTIMPAY_PARTNERS,
    type PartnerInfo,
} from '@/features/passenger-booking/services/paymentService';
import type { SantimPayPartner } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Phone helpers ────────────────────────────────────────────────────────────
// SantimPay requires E.164 (+2519XXXXXXXX). The server forwards accountRef verbatim,
// so we must normalize on the client before sending. A local-format number passes
// the server's 4–40 char length check but is rejected by SantimPay with 422
// Payment.ProviderError, which auto-cancels the booking.

function toE164(raw: string): string {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('251')) digits = digits.slice(3);
    else if (digits.startsWith('0')) digits = digits.slice(1);
    const local = digits.slice(0, 9);
    return local.length > 0 ? `+251${local}` : raw.trim();
}

function isValidAccountRef(raw: string): boolean {
    const e164 = toE164(raw.trim());
    return /^\+251[79]\d{8}$/.test(e164);
}

// ─── Error code helpers ───────────────────────────────────────────────────────

function parsePaymentError(err: unknown): { code: string; existingTxnId?: string | undefined } {
    if (!axios.isAxiosError(err)) return { code: 'unknown' };

    const data = err.response?.data as Record<string, unknown> | undefined;
    // The server wraps errors: { success: false, code?, data?: { existingTransactionId? } }
    const code  = String(data?.code ?? (data?.errors as unknown[] | undefined)?.[0] ?? 'unknown');
    const meta  = (data?.data ?? data?.meta ?? {}) as Record<string, unknown>;
    const existingTxnId = String(meta?.existingTransactionId ?? '').trim() || undefined;
    return existingTxnId !== undefined ? { code, existingTxnId } : { code };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PaymentScreen() {
    const { t } = useTranslation();
    const flow     = useBookingFlowStore();
    const initiate = useInitiatePayment();

    // One idempotency key per screen mount: prevents charging twice on double-tap.
    // If the user navigates away and back they get a new key (which is correct).
    const [idempotencyKey] = useState(() => uuidv4());

    const [selectedPartner, setSelectedPartner] = useState<SantimPayPartner | null>(null);
    // Pre-fill with passenger phone, normalized to E.164 so SantimPay accepts it.
    const [accountRef, setAccountRef] = useState(() => {
        const raw = flow.passengerDetails[0]?.phone ?? '';
        const normalized = toE164(raw);
        return isValidAccountRef(normalized) ? normalized : raw;
    });
    const [error, setError] = useState('');

    const selectedInfo   = SANTIMPAY_PARTNERS.find((p) => p.partner === selectedPartner);
    const totalEtb       = flow.pendingBooking?.totalFare ?? 0;

    // Enforced here, not just at pre-fill time: a local-format or malformed
    // number passes the server's bare length check but is rejected downstream
    // by SantimPay with a 422 that auto-cancels the booking (see file header).
    const accountRefValid = isValidAccountRef(accountRef);
    const showAccountRefError = accountRef.trim().length > 0 && !accountRefValid;
    const canPay = Boolean(selectedPartner) && accountRefValid && !initiate.isPending;

    async function handlePay() {
        if (!flow.pendingBooking || !selectedPartner) return;
        setError('');

        try {
            const txn = await initiate.mutateAsync({
                body: {
                    bookingId:        flow.pendingBooking.id,
                    method:           'SantimPay',
                    accountRef:       toE164(accountRef.trim()),  // must be E.164; server forwards verbatim to SantimPay
                    santimPayPartner: selectedPartner,
                },
                idempotencyKey,
            });

            flow.setPaymentMethod('SantimPay');
            router.push({
                pathname: '/(tabs)/booking/waiting',
                params:   {
                    transactionId:        txn.transactionId,
                    providerInstructions: txn.providerInstructions ?? '',
                    expiresAt:            txn.expiresAt ?? '',
                },
            });
        } catch (e) {
            const { code, existingTxnId } = parsePaymentError(e);

            if (code.includes('AlreadyInProgress') && existingTxnId) {
                // A payment is already running — resume it on the waiting screen
                router.replace({
                    pathname: '/(tabs)/booking/waiting',
                    params:   { transactionId: existingTxnId },
                });
                return;
            }
            if (code.includes('ProviderDisabled')) {
                setError(t('booking.payment.provider_disabled'));
                return;
            }
            if (code.includes('ProviderUnavailable')) {
                setError(t('booking.payment.provider_unavailable'));
                return;
            }
            if (code.includes('ProviderError')) {
                setError(t('booking.payment.provider_error'));
                return;
            }
            setError(e instanceof Error ? e.message : t('errors.generic'));
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.inner}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </Pressable>
                    <Text style={styles.title}>{t('booking.payment.title')}</Text>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Amount due ── */}
                    <View style={styles.amountCard}>
                        <Text style={styles.amountLabel}>Total amount due</Text>
                        <Text style={styles.amountValue}>ETB {totalEtb.toFixed(2)}</Text>
                        <Text style={styles.amountSub}>
                            {flow.selectedSeats.length} seat(s) · {flow.origin} → {flow.destination}
                        </Text>
                    </View>

                    {/* ── Partner selection ── */}
                    <Text style={styles.sectionLabel}>{t('booking.payment.select_method')}</Text>
                    {SANTIMPAY_PARTNERS.map((p: PartnerInfo) => {
                        const active = selectedPartner === p.partner;
                        return (
                            <Pressable
                                key={p.partner}
                                style={[styles.partnerCard, active && styles.partnerCardActive]}
                                onPress={() => { setSelectedPartner(p.partner); setError(''); }}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: active }}
                            >
                                <View style={styles.partnerLeft}>
                                    <Text style={styles.partnerEmoji}>{p.emoji}</Text>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.partnerTitleRow}>
                                            <Text style={styles.partnerLabel}>{p.label}</Text>
                                            {p.badge && (
                                                <View style={styles.badge}>
                                                    <Text style={styles.badgeText}>{p.badge}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.partnerDesc}>{p.description}</Text>
                                    </View>
                                </View>
                                <View style={[styles.radio, active && styles.radioActive]}>
                                    {active && <View style={styles.radioInner} />}
                                </View>
                            </Pressable>
                        );
                    })}

                    {/* ── Account ref + instructions ── */}
                    {selectedInfo && (
                        <>
                            <View style={styles.accountBox}>
                                <Text style={styles.accountLabel}>
                                    {t('booking.payment.account_ref_label', { provider: selectedInfo.label })}
                                </Text>
                                <TextInput
                                    style={[styles.accountInput, showAccountRefError && styles.accountInputError]}
                                    value={accountRef}
                                    onChangeText={(v) => { setAccountRef(v); setError(''); }}
                                    keyboardType="phone-pad"
                                    placeholder="+251 9XX XXX XXX"
                                    placeholderTextColor={Colors.text.disabled}
                                    maxLength={15}
                                    accessibilityLabel="Payment account phone number"
                                />
                                {showAccountRefError && (
                                    <Text style={styles.accountRefError}>
                                        {t('booking.payment.account_ref_invalid')}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.instructionCard}>
                                <Text style={styles.instructionText}>
                                    {selectedInfo.instructions}
                                </Text>
                            </View>
                        </>
                    )}

                    {/* ── Error ── */}
                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {/* ── CTA ── */}
                    <Pressable
                        style={[styles.payBtn, !canPay && styles.payBtnDisabled]}
                        onPress={() => void handlePay()}
                        disabled={!canPay}
                        accessibilityRole="button"
                    >
                        {initiate.isPending ? (
                            <ActivityIndicator color={Colors.neutral.white} />
                        ) : (
                            <Text style={styles.payBtnText}>
                                {t('booking.payment.pay_now', { amount: totalEtb.toFixed(2) })}
                            </Text>
                        )}
                    </Pressable>

                    <Text style={styles.safetyNote}>{t('booking.payment.idempotency_hint')}</Text>

                    <View style={{ height: Spacing.xl }} />
                </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.brand.primaryDark },
    inner:     { flex: 1, backgroundColor: Colors.background.secondary },
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

    amountCard: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        gap: 4,
        ...Shadow.md,
    },
    amountLabel: { color: Colors.brand.onPrimary, fontSize: 13, fontWeight: '600' },
    amountValue: { color: Colors.neutral.white, fontSize: 36, fontWeight: '900' },
    amountSub:   { color: Colors.brand.onPrimary, fontSize: 12 },

    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text.tertiary,
        letterSpacing: 0.5,
        marginTop: Spacing.xs,
    },

    partnerCard: {
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
    partnerCardActive: {
        borderColor: Colors.brand.primary,
        backgroundColor: Colors.brand.primaryTint,
    },
    partnerLeft:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    partnerEmoji:    { fontSize: 28 },
    partnerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
    partnerLabel:    { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
    partnerDesc:     { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
    badge: {
        backgroundColor: Colors.semantic.successLight,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    badgeText: { fontSize: 10, fontWeight: '700', color: Colors.semantic.success },
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

    accountBox: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        gap: 8,
        ...Shadow.sm,
    },
    accountLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
    accountInput: {
        borderWidth: 1.5,
        borderColor: Colors.border.medium,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: 13,
        fontSize: 16,
        color: Colors.text.primary,
        backgroundColor: Colors.background.secondary,
    },
    accountInputError: { borderColor: Colors.semantic.error },
    accountRefError:   { color: Colors.semantic.error, fontSize: 12, fontWeight: '600' },
    instructionCard: {
        backgroundColor: Colors.semantic.infoLight,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
    },
    instructionText: { fontSize: 13, color: Colors.semantic.info, lineHeight: 20 },

    error: {
        color: Colors.semantic.error,
        fontWeight: '700',
        textAlign: 'center',
        fontSize: 13,
    },

    payBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.xs,
        ...Shadow.sm,
    },
    payBtnDisabled: { opacity: 0.4 },
    payBtnText:     { color: Colors.neutral.white, fontWeight: '800', fontSize: 16 },
    safetyNote:     { color: Colors.text.tertiary, fontSize: 11, textAlign: 'center' },
});
