// app/_layout.tsx
import * as Sentry from '@sentry/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';

import { initI18n } from '../src/lib/i18n';
import { queryClient } from '../src/lib/queryClient';
import { readString } from '../src/lib/storage';
import { MMKVKeys } from '../src/constants/mmkvKeys';
import { Colors } from '../src/constants';
import { AppErrorBoundary } from '../src/components/ErrorBoundary';
import { useAuthStore } from '../src/features/auth/store/authStore';
import {
    Notifications,
    setupNotifications,
    getNavigationFromNotification,
} from '../src/lib/notifications';

// ── Sentry: must be initialised at module level, before any component renders ──
Sentry.init({
    // Set EXPO_PUBLIC_SENTRY_DSN in your .env / EAS Secrets before building.
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    enabled:           !__DEV__ && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
    tracesSampleRate:  __DEV__ ? 1.0 : 0.15,
    attachStacktrace:  true,
    environment:       __DEV__ ? 'development' : 'production',
});

// Keep OS splash screen visible until both i18n and auth check are done.
void SplashScreen.preventAutoHideAsync();

// ── Root layout ────────────────────────────────────────────────────────────────

function RootLayout() {
    const [i18nReady, setI18nReady] = useState(false);
    const authInitialized = useAuthStore((s) => s.authInitialized);
    const notifSub = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

    // Initialise i18n synchronously from MMKV on first render
    useEffect(() => {
        const savedLanguage = readString(MMKVKeys.PREFERRED_LANGUAGE);
        initI18n(savedLanguage ?? undefined);
        setI18nReady(true);
    }, []);

    // Hide the OS splash screen once i18n is ready AND auth check has completed.
    // This prevents the visible tabs→auth→tabs redirect flash on every cold open.
    useEffect(() => {
        if (i18nReady && authInitialized) {
            void SplashScreen.hideAsync();
        }
    }, [i18nReady, authInitialized]);

    // Initialise push notifications after i18n is ready
    useEffect(() => {
        if (!i18nReady) return;

        void setupNotifications();

        // Navigate to the relevant screen when the user taps a notification
        notifSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data ?? {};
            const path = getNavigationFromNotification(data as Record<string, unknown>);
            if (path) router.push(path as never);
        });

        return () => { notifSub.current?.remove(); };
    }, [i18nReady]);

    if (!i18nReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary }}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
        );
    }

    return (
        <AppErrorBoundary>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <QueryClientProvider client={queryClient}>
                        <StatusBar style="dark" />
                        <Stack screenOptions={{ headerShown: false }}>
                            {/* Auth group */}
                            <Stack.Screen name="(auth)" />

                            {/* Tabs + all sub-screens with tab bar */}
                            <Stack.Screen name="(tabs)" />

                            {/* Full-screen live tracking (no tab bar) */}
                            <Stack.Screen
                                name="trip/[id]/tracking"
                                options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                            />
                        </Stack>
                    </QueryClientProvider>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </AppErrorBoundary>
    );
}

// Sentry.wrap() adds automatic navigation breadcrumbs for Expo Router.
export default Sentry.wrap(RootLayout);
