// app/(tabs)/booking/waiting.tsx
// Polls payment status every 4 s (up to 30 tries = 2 min).
// Also listens for the deep-link callback from the payment provider:
//   adrash://payment/callback?status=success&ref=<gatewayRef>
// When either confirms success → navigate to confirmation screen.

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

const POLL_INTERVAL_MS = 4_000;
const MAX_TRIES        = 30; // 2 minutes

export default function WaitingScreen() {
    const { t } = useTranslation();
    const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
    const verify  = useVerifyPayment();
    const pending = useBookingFlowStore((s) => s.pendingBooking);

    const [tries,   setTries]   = useState(0);
    const [timedOut, setTimedOut] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const goToConfirmation = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        router.replace('/(tabs)/booking/confirmation');
    }, []);

    // ── Polling ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!transactionId || tries >= MAX_TRIES) {
            if (tries >= MAX_TRIES) setTimedOut(true);
            return;
        }

        intervalRef.current = setInterval(() => {
            setTries((n) => {
                if (n >= MAX_TRIES) {
                    clearInterval(intervalRef.current!);
                    setTimedOut(true);
                    return n;
                }
                verify.mutate(transactionId, {
                    onSuccess: (txn) => {
                        if (txn.status === 'Success') goToConfirmation();
                    },
                });
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
                    if (status === 'success') goToConfirmation();
                }
            } catch { /* malformed URL — ignore */ }
        };

        const sub = Linking.addEventListener('url', handler);

        // Handle case where app was cold-started from a payment deep link
        Linking.getInitialURL().then((url) => {
            if (url) handler({ url });
        });

        return () => sub.remove();
    }, [goToConfirmation]);

    // ── UI ────────────────────────────────────────────────────────────────────
    const status   = verify.data?.status ?? 'Pending';
    const isFailed = status === 'Failed' || status === 'Expired' || timedOut;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
                        ? t('booking.payment.title') + ' – ' + status
                        : t('booking.waiting.title')}
                </Text>

                <Text style={styles.sub}>
                    {isFailed
                        ? 'The payment did not complete. Please try again.'
                        : t('booking.waiting.message')}
                </Text>

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
                            onSuccess: (txn) => { if (txn.status === 'Success') goToConfirmation(); },
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },
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
    icon:      { fontSize: 36, color: Colors.semantic.error, fontWeight: '800' },
    heading:   { fontSize: 22, fontWeight: '900', color: Colors.text.primary, textAlign: 'center' },
    headingError: { color: Colors.semantic.error },
    sub:       { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 },
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
