// app/(auth)/agreement.tsx
//
// Three modes:
//   1. First-time onboarding  — from splash → after accept goes to /(auth)/phone (OTP)
//   2. Re-accept (mid-session 403) — params: { reaccept: '1' }
//      → after accept, router.back() returns to wherever the 403 fired
//   3. Re-accept after returning-user login — params: { reaccept: '1' }
//      → same as above; phone-login already authenticated the user

import { useCallback, useMemo } from 'react';
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
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import {
    useAcceptAgreement,
    useCurrentAgreement,
} from '../../src/features/agreements/hooks/useAgreements';
import { useAuthStore } from '../../src/features/auth/store/authStore';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

function decodeAgreementContent(content: string): string {
    return content
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export default function AgreementScreen() {
    const { reaccept } = useLocalSearchParams<{ reaccept?: string }>();
    const isReaccept   = reaccept === '1';

    const { data: agreement, isLoading, isError, refetch } = useCurrentAgreement();
    const { mutate: accept, isPending: accepting, error: acceptError } = useAcceptAgreement();
    const authAccept = useAuthStore((s) => s.acceptAgreement);

    const agreementBody = useMemo(
        () => (agreement ? decodeAgreementContent(agreement.content) : ''),
        [agreement],
    );

    const handleAgree = useCallback(() => {
        if (!agreement || accepting) return;

        accept(
            { agreementType: 'Passenger', documentVersion: agreement.version },
            {
                onSuccess: () => {
                    authAccept(agreement.version);

                    if (isReaccept) {
                        // Mid-session re-accept → return to the screen that triggered it
                        router.back();
                    } else {
                        // First-time onboarding → phone number + OTP
                        router.replace('/(auth)/phone');
                    }
                },
            },
        );
    }, [agreement, accepting, accept, authAccept, isReaccept]);

    const handleDecline = useCallback(() => {
        if (isReaccept) {
            // Return to phone-login rather than pin-login
            router.replace('/(auth)/phone-login');
        } else {
            router.replace('/(auth)');
        }
    }, [isReaccept]);

    const canAgree = !accepting && !isLoading && !isError;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
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

            {/* Body */}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.brand.primary} />
                    <Text style={styles.loadingText}>Loading agreement…</Text>
                </View>
            ) : isError ? (
                <View style={styles.centered}>
                    <Text style={styles.errorEmoji}>⚠️</Text>
                    <Text style={styles.errorTitle}>Could not load agreement</Text>
                    <Text style={styles.errorBody}>Check your connection and try again.</Text>
                    <Pressable style={styles.retryBtn} onPress={() => refetch()}>
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator
                >
                    {agreement && (
                        <>
                            <Text style={styles.agreementTitle}>{agreement.title}</Text>
                            <Text style={styles.agreementBody}>{agreementBody}</Text>
                        </>
                    )}
                    <View style={{ height: Spacing.xl }} />
                </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.footer}>
                {acceptError && (
                    <Text style={styles.acceptError}>
                        Could not record your acceptance. Please try again.
                    </Text>
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
                    accessibilityLabel={isReaccept ? 'Go back' : 'I do not agree'}
                >
                    <Text style={styles.declineBtnText}>
                        {isReaccept ? 'Go back' : 'I do not agree'}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.primary },
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
    title: { fontSize: 22, fontWeight: '800', color: Colors.text.primary },
    meta:  { fontSize: 12, color: Colors.text.tertiary, marginTop: 4 },
    centered: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: Spacing.xl, gap: Spacing.md,
    },
    loadingText: { color: Colors.text.tertiary, fontSize: 14, marginTop: Spacing.sm },
    errorEmoji: { fontSize: 48 },
    errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
    errorBody:  { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center' },
    retryBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 12,
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.sm,
    },
    retryText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 15 },
    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
    agreementTitle: {
        fontSize: 18, fontWeight: '700',
        color: Colors.text.primary, marginBottom: Spacing.md,
    },
    agreementBody: { fontSize: 14, lineHeight: 22, color: Colors.text.secondary },
    footer: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.border.light,
        backgroundColor: Colors.background.primary,
        gap: Spacing.md,
    },
    agreeBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
    },
    agreeBtnDisabled: { backgroundColor: Colors.neutral.gray300 },
    agreeBtnText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 16 },
    acceptError: {
        color: Colors.semantic.error, fontSize: 12,
        textAlign: 'center', fontWeight: '600',
    },
    declineBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
    declineBtnText: { color: Colors.text.tertiary, fontWeight: '500', fontSize: 14 },
});