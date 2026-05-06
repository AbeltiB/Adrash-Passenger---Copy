import '../../src/features/tracking/tasks/backgroundLocationTask'; // Register background task
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '../src/lib/queryClient';
import { initI18n } from '../src/lib/i18n';
import { storage } from '../src/lib/storage';
import { MMKVKeys, Colors } from '../src/constants';
import { getAccessToken, getRefreshToken } from '../src/features/auth/utils/token';
import { useAuthStore } from '../src/features/auth/store/authStore';
import { OfflineBanner } from '../src/components/layout/OfflineBanner';
import type { Language } from '../src/types';

// ── SYNCHRONOUS i18n INIT ──────────────────────────────────────
// Must run at module level — before the first React render — so that
// the very first frame already renders in the correct language.
// MMKV reads are synchronous, so this is safe to do here.
const savedLang = storage.getString(MMKVKeys.PREFERRED_LANGUAGE) as Language | undefined;
initI18n(savedLang);
// ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  useEffect(() => {
    async function bootstrap() {
      try {
        // Check for existing valid tokens
        const [accessToken, refreshToken] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
        ]);

        if (accessToken && refreshToken) {
          setTokens(accessToken, refreshToken);
          setAuthenticated(true);
          router.replace('/(tabs)/dashboard');
        } else {
          router.replace('/(auth)/');
        }
      } catch {
        router.replace('/(auth)/');
      } finally {
        setIsReady(true);
      }
    }

    bootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <OfflineBanner />
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}