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
        // Initialize i18n synchronously with saved language preference
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
                        {/* Group layouts — expo-router renders _layout inside each */}
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />

                        {/* Standalone screens outside groups */}
                        <Stack.Screen name="notifications" />
                        <Stack.Screen name="search/results" />

                        {/* Booking flow */}
                        <Stack.Screen name="booking/pickup" />
                        <Stack.Screen name="booking/seats" />
                        <Stack.Screen name="booking/passengers" />
                        <Stack.Screen name="booking/summary" />
                        <Stack.Screen name="booking/payment" />
                        <Stack.Screen name="booking/waiting" />
                        <Stack.Screen name="booking/confirmation" />

                        {/* Trip screens */}
                        <Stack.Screen name="trip/[id]/index" />
                        <Stack.Screen
                            name="trip/[id]/tracking"
                            options={{ presentation: 'fullScreenModal' }}
                        />
                    </Stack>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}