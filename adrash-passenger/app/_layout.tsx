// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';

import { initI18n } from '../src/lib/i18n';
import { queryClient } from '../src/lib/queryClient';
import { readString } from '../src/lib/storage';
import { MMKVKeys } from '../src/constants/mmkvKeys';
import { Colors } from '../src/constants';

export default function RootLayout() {
    const [i18nReady, setI18nReady] = useState(false);

    useEffect(() => {
        const savedLanguage = readString(MMKVKeys.PREFERRED_LANGUAGE);
        initI18n(savedLanguage ?? undefined);
        setI18nReady(true);
    }, []);

    if (!i18nReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary }}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <StatusBar style="auto" />
                    <Stack screenOptions={{ headerShown: false }}>
                        {/* Auth group */}
                        <Stack.Screen name="(auth)" />

                        {/* Tabs group — tab bar lives here.
                            All screens that should SHOW the tab bar must be
                            nested inside (tabs)/_layout.tsx, not here. */}
                        <Stack.Screen name="(tabs)" />

                        {/* ── Screens that intentionally hide the tab bar ── */}

                        {/* Full-screen live tracking modal */}
                        <Stack.Screen
                            name="trip/[id]/tracking"
                            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                        />
                    </Stack>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}