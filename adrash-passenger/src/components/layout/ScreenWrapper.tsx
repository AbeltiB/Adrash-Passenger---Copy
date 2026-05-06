// ─── ScreenWrapper ────────────────────────────────────────────────────────────
// A thin convenience wrapper around SafeAreaView that applies the standard
// screen background and padding used across the app.  Accepts all
// SafeAreaView props so callers can customise edges, style, etc.
//
// Usage:
//   import { ScreenWrapper } from '../../src/components/layout/ScreenWrapper';
//   <ScreenWrapper edges={['top', 'bottom']} style={styles.container}>
//     {children}
//   </ScreenWrapper>

import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants';

interface ScreenWrapperProps {
    children: React.ReactNode;
    /** Which edges get safe-area insets. Defaults to ['top', 'bottom']. */
    edges?: Edge[];
    /** Extra styles merged on top of the default container. */
    style?: StyleProp<ViewStyle>;
    /** Override background colour. Defaults to Colors.background.primary. */
    backgroundColor?: string;
    /** When true, removes the default horizontal padding. */
    noPadding?: boolean;
}

export function ScreenWrapper({
    children,
    edges = ['top', 'bottom'],
    style,
    backgroundColor = Colors.background.primary,
    noPadding = false,
}: ScreenWrapperProps) {
    return (
        <SafeAreaView
            edges={edges}
            style={[
                styles.base,
                { backgroundColor },
                noPadding ? null : styles.padded,
                style,
            ]}
        >
            {children}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    base: {
        flex: 1,
    },
    padded: {
        paddingHorizontal: Spacing.xl,
    },
});