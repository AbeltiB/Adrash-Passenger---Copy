// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../src/lib/i18n';
import { queryClient } from '../src/lib/queryClient';

export default function RootLayout() {
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