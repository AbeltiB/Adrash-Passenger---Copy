// ─── OfflineBanner ────────────────────────────────────────────────────────────
// Displays a dismissible banner at the top of the screen when the device has
// no internet connection.  Uses @react-native-community/netinfo to observe
// connectivity changes reactively.
//
// Usage (in your root layout or any screen):
//   import { OfflineBanner } from '../src/components/layout/OfflineBanner';
//   ...
//   <OfflineBanner />   ← renders nothing when online

import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Colors, Spacing } from '../../constants';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const offline = !(state.isConnected && state.isInternetReachable);
            setIsOffline(offline);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOffline ? 0 : -60,
            duration: 280,
            useNativeDriver: true,
        }).start();
    }, [isOffline, slideAnim]);

    // Always mount so the animation can run; visually absent when online
    return (
        <Animated.View
            style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
            pointerEvents={isOffline ? 'auto' : 'none'}
            accessibilityLiveRegion="polite"
            accessibilityLabel="No internet connection"
        >
            <View style={styles.inner}>
                <Text style={styles.icon}>📵</Text>
                <Text style={styles.text}>No internet connection</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: Colors.semantic.error,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.base,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    icon: { fontSize: 16 },
    text: {
        color: Colors.neutral.white,
        fontWeight: '700',
        fontSize: 13,
        textAlign: 'center',
    },
});