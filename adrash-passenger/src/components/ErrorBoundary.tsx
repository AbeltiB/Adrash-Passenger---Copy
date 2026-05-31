// src/components/ErrorBoundary.tsx
// Wraps the app tree. Catches any unhandled React render error, reports it to
// Sentry, and shows a recovery screen instead of a blank white crash.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Colors, Spacing, BorderRadius } from '../constants';

// ─── Fallback UI ──────────────────────────────────────────────────────────────

function ErrorFallback({
    error,
    resetError,
}: {
    error: Error;
    resetError: () => void;
}) {
    return (
        <View style={styles.container}>
            <Text style={styles.emoji}>⚠️</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.sub}>
                The app ran into an unexpected error. It has been reported automatically.
            </Text>
            {__DEV__ && (
                <View style={styles.devBox}>
                    <Text style={styles.devText} numberOfLines={6}>
                        {error.message}
                    </Text>
                </View>
            )}
            <Pressable style={styles.btn} onPress={resetError} accessibilityRole="button">
                <Text style={styles.btnText}>Try again</Text>
            </Pressable>
        </View>
    );
}

// ─── Exported boundary ────────────────────────────────────────────────────────

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <Sentry.ErrorBoundary
            fallback={({ error, resetError }) => (
                <ErrorFallback error={error as Error} resetError={resetError} />
            )}
        >
            {children}
        </Sentry.ErrorBoundary>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing['2xl'],
        backgroundColor: Colors.background.primary,
        gap: Spacing.md,
    },
    emoji: { fontSize: 52 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
    sub: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 300,
    },
    devBox: {
        backgroundColor: Colors.semantic.errorLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        width: '100%',
    },
    devText: {
        fontFamily: 'monospace',
        fontSize: 11,
        color: Colors.semantic.error,
    },
    btn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 14,
        paddingHorizontal: Spacing['2xl'],
        marginTop: Spacing.sm,
    },
    btnText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 16 },
});
