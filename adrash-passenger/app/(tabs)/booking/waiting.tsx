// app/(tabs)/booking/waiting.tsx
// Polls payment status every 4 s (up to 30 tries = 2 min).
// Also listens for the deep-link callback from the payment provider:
//   adrash://payment/callback?status=success&ref=<gatewayRef>
// When either confirms success → re-fetches the confirmed booking → confirmation screen.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { useVerifyPayment } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import { bookingRepository } from '@/features/passenger-booking/repositories/bookingRepository';

const POLL_INTERVAL_MS = 4_000;
const MAX_TRIES        = 30; // 2 minutes

// PaymentStatusDTO terminal failure states (from spec + server enum)
const FAILED_STATUSES = new Set(['Failed', 'TimedOut', 'Expired']);

export default function WaitingScreen() {
    const { t } = useTranslation();
    const {
        transactionId,
        providerInstructions,
        expiresAt,
    } = useLocalSearchParams<{
        transactionId:        string;
        providerInstructions: string;
        expiresAt:            string;
    }>();

    const verify          = useVerifyPayment();
    const pending         = useBookingFlowStore((s) => s.pendingBooking);
    const setPending      = useBookingFlowStore((s) => s.setPendingBooking);

    const [tries,     setTries]     = useState(0);
    const [timedOut,  setTimedOut]  = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const navigatingRef = useRef(false); // guard: only navigate once

    // ── Expiry countdown ──────────────────────────────────────────────────────
    const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!expiresAt) return;
        const tick = () => {
            const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
            setMinutesLeft(Math.ceil(diff / 60_000));
        };
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, [expiresAt]);

    // ── Navigate to confirmation (re-fetch confirmed booking first) ────────────
    const goToConfirmation = useCallback(async () => {
        if (navigatingRef.current) return;
        navigatingRef.current = true;

        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

        // Re-fetch the booking so confirmation screen shows Confirmed status + QR code
        if (pending?.id) {
            try {
                const confirmed = await bookingRepository.detail(pending.id);
                setPending(confirmed);
            } catch {
                // On fetch failure keep the existing data — confirmation still works
            }
        }

        router.replace('/(tabs)/booking/confirmation');
    }, [pending?.id, setPending]);

    // ── Polling ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!transactionId) return;

        function doVerify() {
            verify.mutate(transactionId, {
                onSuccess: (txn) => {
                    if (txn.status === 'Success') void goToConfirmation();
                },
            });
        }

        // Immediate first check — no 4-second wait on arrival
        doVerify();

        intervalRef.current = setInterval(() => {
            setTries((n) => {
                if (n >= MAX_TRIES) {
                    clearInterval(intervalRef.current!);
                    setTimedOut(true);
                    return n;
                }
                doVerify();
                return n + 1;
            });
        }, POLL_INTERVAL_MS);

        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionId]);

    // ── Deep-link listener (adrash://payment/callback) ────────────────────────
    useEffect(() => {
        const handler = ({ url }: { url: string }) => {
            try {
                const parsed = new URL(url);
                if (parsed.hostname === 'payment' && parsed.pathname === '/callback') {
                    const status = parsed.searchParams.get('status');
                    if (status === 'success') void goToConfirmation();
                }
            } catch { /* malformed URL — ignore */ }
        };

        const sub = Linking.addEventListener('url', handler);
        Linking.getInitialURL().then((url) => { if (url) handler({ url }); });
        return () => sub.remove();
    }, [goToConfirmation]);

    // ── UI ────────────────────────────────────────────────────────────────────
    const status   = verify.data?.status ?? 'Pending';
    const isFailed = FAILED_STATUSES.has(status) || timedOut;

    const instructions = (providerInstructions ?? '').trim();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.inner}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={[styles.iconRing, isFailed && styles.iconRingError]}>
                    {isFailed ? (
                        <Text style={styles.icon}>✕</Text>
                    ) : (
                        <ActivityIndicator size="large" color={Colors.brand.primary} />
                    )}
                </View>

                {/* Status title */}
                <Text style={[styles.heading, isFailed && styles.headingError]}>
                    {isFailed
                        ? (timedOut ? 'Payment timed out' : `Payment ${status.toLowerCase()}`)
                        : t('booking.waiting.title')}
                </Text>

                <Text style={styles.sub}>
                    {isFailed
                        ? 'The payment did not complete. Please try again.'
                        : t('booking.waiting.message')}
                </Text>

                {/* Provider instructions (from initiate response) */}
                {!isFailed && instructions ? (
                    <View style={styles.instructionCard}>
                        <Text style={styles.instructionText}>{instructions}</Text>
                    </View>
                ) : null}

                {/* Expiry */}
                {!isFailed && minutesLeft !== null && minutesLeft > 0 ? (
                    <Text style={styles.expiry}>
                        Expires in {minutesLeft} min
                    </Text>
                ) : null}

                {/* Booking reference */}
                {pending?.bookingReference ? (
                    <View style={styles.refCard}>
                        <Text style={styles.refLabel}>Booking ref</Text>
                        <Text style={styles.refValue}>{pending.bookingReference}</Text>
                    </View>
                ) : null}

                {/* Manual verify */}
                {!isFailed && (
                    <Pressable
                        style={styles.verifyBtn}
                        onPress={() => transactionId && verify.mutate(transactionId, {
                            onSuccess: (txn) => { if (txn.status === 'Success') void goToConfirmation(); },
                        })}
                        disabled={verify.isPending}
                    >
                        {verify.isPending ? (
                            <ActivityIndicator color={Colors.brand.primary} />
                        ) : (
                            <Text style={styles.verifyBtnText}>Check now</Text>
                        )}
                    </Pressable>
                )}

                {/* Timeout / failed retry */}
                {isFailed && (
                    <Pressable
                        style={styles.retryBtn}
                        onPress={() => router.replace('/(tabs)/booking/payment')}
                    >
                        <Text style={styles.retryBtnText}>Try a different method</Text>
                    </Pressable>
                )}
            </View>
          </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.brand.primaryDark },
    inner:     { flex: 1, backgroundColor: Colors.background.secondary },
    content: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: Spacing['2xl'], gap: Spacing.lg,
    },
    iconRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.brand.primaryTint,
        alignItems: 'center', justifyContent: 'center',
        ...Shadow.sm,
    },
    iconRingError: { backgroundColor: Colors.semantic.errorLight },
    icon:         { fontSize: 36, color: Colors.semantic.error, fontWeight: '800' },
    heading:      { fontSize: 22, fontWeight: '900', color: Colors.text.primary, textAlign: 'center' },
    headingError: { color: Colors.semantic.error },
    sub:          { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 },

    instructionCard: {
        backgroundColor: Colors.semantic.infoLight,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        width: '100%',
    },
    instructionText: { fontSize: 13, color: Colors.semantic.info, lineHeight: 20, textAlign: 'center' },

    expiry: {
        fontSize: 12, color: Colors.text.tertiary, fontWeight: '600',
    },

    refCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
        ...Shadow.sm,
    },
    refLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600', letterSpacing: 0.5 },
    refValue: { fontSize: 18, fontWeight: '800', color: Colors.text.primary, marginTop: 2 },

    verifyBtn: {
        borderWidth: 1.5, borderColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 12, paddingHorizontal: Spacing.xl,
        minWidth: 160, alignItems: 'center',
    },
    verifyBtnText: { color: Colors.brand.primary, fontWeight: '700' },

    retryBtn: {
        backgroundColor: Colors.semantic.error,
        borderRadius: BorderRadius.lg,
        paddingVertical: 14, paddingHorizontal: Spacing.xl,
        alignItems: 'center',
    },
    retryBtnText: { color: Colors.neutral.white, fontWeight: '700' },
});
