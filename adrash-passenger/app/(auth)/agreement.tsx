// app/(auth)/agreement.tsx
//
// Two modes:
//   1. First-time onboarding  — reached from splash after language selection
//   2. Re-accept (mid-session) — reached when the API interceptor catches a
//      403 Auth.AgreementUpdateRequired and calls router.replace('/agreement')
//
// Mode is detected via the `reaccept` search param:
//   router.replace({ pathname: '/(auth)/agreement', params: { reaccept: '1' } })

import { useCallback, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ActivityIndicator,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import {
    useAcceptAgreement,
    useCurrentAgreement,
} from '../../src/features/agreements/hooks/useAgreements';
import { useAuthStore } from '../../src/features/auth/store/authStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgreementScreen() {
    // Is this a mid-session re-accept (triggered by 403)?
    const { reaccept } = useLocalSearchParams<{ reaccept?: string }>();
    const isReaccept = reaccept === '1';

    // ── Data ─────────────────────────────────────────────────────────────────
    const { data: agreement, isLoading, isError, refetch } = useCurrentAgreement();
    const { mutate: accept, isPending: accepting } = useAcceptAgreement();
    const authAccept = useAuthStore((s) => s.acceptAgreement);

    // ── Scroll tracking ───────────────────────────────────────────────────────
    // "I agree" stays disabled until the user has scrolled to within 20px
    // of the bottom of the agreement text.
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    const handleScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (hasScrolledToBottom) return;
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            const isAtBottom =
                contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
            if (isAtBottom) setHasScrolledToBottom(true);
        },
        [hasScrolledToBottom],
    );

    // If the agreement is very short (less than one screen), auto-enable.
    const handleLayout = useCallback(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
    }, []);

    // ── Accept handler ────────────────────────────────────────────────────────
    const handleAgree = useCallback(() => {
        if (!agreement || accepting) return;

        accept(
            { agreementType: 'Passenger', documentVersion: agreement.version },
            {
                onSuccess: () => {
                    // 1. Persist acceptance in local auth store
                    authAccept(agreement.version);

                    // 2. Navigate based on mode
                    if (isReaccept) {
                        // Return the user to wherever they were before the 403
                        router.back();
                    } else {
                        // First-time onboarding → phone number entry
                        router.replace('/(auth)/phone');
                    }
                },
            },
        );
    }, [agreement, accepting, accept, authAccept, isReaccept]);

    // ── Decline handler ───────────────────────────────────────────────────────
    const handleDecline = useCallback(() => {
        if (isReaccept) {
            // Can't continue without accepting — log them out
            router.replace('/(auth)/phone');
        } else {
            // Go back to language selector
            router.replace('/(auth)');
        }
    }, [isReaccept]);

    // ── Render states ─────────────────────────────────────────────────────────

    const canAgree = hasScrolledToBottom && !accepting && !isLoading && !isError;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* ── Header ── */}
            <View style={styles.header}>
                {isReaccept && (
                    <View style={styles.updateBanner}>
                        <Text style={styles.updateBannerText}>
                            📋 Our terms have been updated — please review and accept to continue
                        </Text>
                    </View>
                )}
                <Text style={styles.title}>
                    {isReaccept ? 'Updated Terms' : 'Passenger Agreement'}
                </Text>
                {agreement && (
                    <Text style={styles.meta}>
                        Version {agreement.version} · Effective {formatDate(agreement.effectiveDate)}
                    </Text>
                )}
            </View>

            {/* ── Body ── */}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.brand.primary} />
                    <Text style={styles.loadingText}>Loading agreement…</Text>
                </View>
            ) : isError ? (
                <View style={styles.centered}>
                    <Text style={styles.errorEmoji}>⚠️</Text>
                    <Text style={styles.errorTitle}>Could not load agreement</Text>
                    <Text style={styles.errorBody}>
                        Check your connection and try again.
                    </Text>
                    <Pressable style={styles.retryBtn} onPress={() => refetch()}>
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    ref={scrollRef}
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    onScroll={handleScroll}
                    // Fire onScroll frequently enough to catch the bottom reliably
                    scrollEventThrottle={100}
                    onContentSizeChange={handleLayout}
                    showsVerticalScrollIndicator
                >
                    {agreement && (
                        <>
                            <Text style={styles.agreementTitle}>{agreement.title}</Text>
                            {/* Render plain-text content.
                                If your API returns HTML, replace this with a
                                WebView or a lightweight HTML renderer. */}
                            <Text style={styles.agreementBody}>{agreement.content}</Text>
                        </>
                    )}
                    {/* Spacer so the last line isn't hidden behind the footer */}
                    <View style={{ height: Spacing.xl }} />
                </ScrollView>
            )}

            {/* ── Footer ── */}
            <View style={styles.footer}>
                {/* Scroll progress hint */}
                {!isLoading && !isError && (
                    <View style={styles.progressRow}>
                        <View
                            style={[
                                styles.progressDot,
                                hasScrolledToBottom && styles.progressDotDone,
                            ]}
                        />
                        <Text style={styles.progressText}>
                            {hasScrolledToBottom
                                ? '✓ You have read the full agreement'
                                : 'Scroll to read all before agreeing'}
                        </Text>
                    </View>
                )}

                <Pressable
                    style={[styles.agreeBtn, !canAgree && styles.agreeBtnDisabled]}
                    onPress={handleAgree}
                    disabled={!canAgree}
                    accessibilityRole="button"
                    accessibilityLabel="I agree and continue"
                    accessibilityState={{ disabled: !canAgree }}
                >
                    {accepting ? (
                        <ActivityIndicator color={Colors.neutral.white} />
                    ) : (
                        <Text style={styles.agreeBtnText}>I agree and continue</Text>
                    )}
                </Pressable>

                <Pressable
                    style={styles.declineBtn}
                    onPress={handleDecline}
                    disabled={accepting}
                    accessibilityRole="button"
                    accessibilityLabel={isReaccept ? 'Log out' : 'I do not agree'}
                >
                    <Text style={styles.declineBtnText}>
                        {isReaccept ? 'Log out' : 'I do not agree'}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.primary,
    },

    // ── Header ──
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    updateBanner: {
        backgroundColor: Colors.semantic.warningLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    updateBannerText: {
        color: Colors.semantic.warning,
        fontWeight: '600',
        fontSize: 13,
        lineHeight: 18,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    meta: {
        fontSize: 12,
        color: Colors.text.tertiary,
        marginTop: 4,
    },

    // ── Loading / error ──
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    loadingText: {
        color: Colors.text.tertiary,
        fontSize: 14,
        marginTop: Spacing.sm,
    },
    errorEmoji: { fontSize: 48 },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    errorBody: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center',
    },
    retryBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 12,
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.sm,
    },
    retryText: {
        color: Colors.neutral.white,
        fontWeight: '700',
        fontSize: 15,
    },

    // ── Scroll body ──
    scroll: { flex: 1 },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
    },
    agreementTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: Spacing.md,
    },
    agreementBody: {
        fontSize: 14,
        lineHeight: 22,
        color: Colors.text.secondary,
    },

    // ── Footer ──
    footer: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.border.light,
        backgroundColor: Colors.background.primary,
        gap: Spacing.md,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    progressDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.border.medium,
    },
    progressDotDone: {
        backgroundColor: Colors.semantic.success,
    },
    progressText: {
        fontSize: 12,
        color: Colors.text.tertiary,
        flex: 1,
    },
    agreeBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
    },
    agreeBtnDisabled: {
        backgroundColor: Colors.neutral.gray300,
    },
    agreeBtnText: {
        color: Colors.neutral.white,
        fontWeight: '700',
        fontSize: 16,
    },
    declineBtn: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    declineBtnText: {
        color: Colors.text.tertiary,
        fontWeight: '500',
        fontSize: 14,
    },
});