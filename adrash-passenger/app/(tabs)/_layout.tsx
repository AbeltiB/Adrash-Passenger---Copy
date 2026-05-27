// app/(tabs)/_layout.tsx
// Bottom-tab navigation: Home · Trips · Rewards · Profile (exactly 4 tabs).
// All booking/search/detail sub-screens live inside this group so the tab bar
// stays visible; they are hidden from the tab strip via href: null.

import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { Colors } from '../../src/constants';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
    return <Text style={{ fontSize: 22, color }}>{emoji}</Text>;
}

const tabIcon = (emoji: string) => {
    function RenderTabIcon({ color }: { color: string }) {
        return <TabIcon emoji={emoji} color={color} />;
    }
    return RenderTabIcon;
};

export default function TabsLayout() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const insets = useSafeAreaInsets();

    if (!isAuthenticated) return <Redirect href="/(auth)" />;

    const tabBarHeight = 56 + insets.bottom;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor:   Colors.brand.primary,
                tabBarInactiveTintColor: Colors.neutral.gray400,
                tabBarStyle: {
                    backgroundColor: Colors.background.primary,
                    borderTopColor:  Colors.border.light,
                    borderTopWidth:  1,
                    height:          tabBarHeight,
                    paddingBottom:   insets.bottom || 8,
                    paddingTop:      6,
                    elevation:       8,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            {/* ── The four visible tab items ─────────────────────────────── */}
            <Tabs.Screen
                name="index"
                options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }}
            />
            <Tabs.Screen
                name="my-trips"
                options={{ title: 'Trips', tabBarIcon: tabIcon('🎫') }}
            />
            <Tabs.Screen
                name="rewards"
                options={{ title: 'Rewards', tabBarIcon: tabIcon('🎁') }}
            />
            <Tabs.Screen
                name="profile"
                options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }}
            />

            {/* ── Screens with NO tab button ────────────────────────────── */}
            <Tabs.Screen name="notifications"        options={{ href: null }} />
            <Tabs.Screen name="search/results"       options={{ href: null }} />

            {/* Booking flow */}
            <Tabs.Screen name="booking/pickup"       options={{ href: null }} />
            <Tabs.Screen name="booking/seats"        options={{ href: null }} />
            <Tabs.Screen name="booking/passengers"   options={{ href: null }} />
            <Tabs.Screen name="booking/summary"      options={{ href: null }} />
            <Tabs.Screen name="booking/payment"      options={{ href: null }} />
            <Tabs.Screen name="booking/waiting"      options={{ href: null }} />
            <Tabs.Screen name="booking/confirmation" options={{ href: null }} />

            {/* Trip detail screens — no tab buttons */}
            <Tabs.Screen name="trip/[id]/index"      options={{ href: null }} />
            {/* IMPORTANT: trips/[id]/index must be listed here with href:null.
                The file exists (as a redirect shim) so Expo Router sees it.
                Without this entry it becomes an unregistered tab (phantom 5th tab). */}
            <Tabs.Screen name="trips/[id]/index"     options={{ href: null }} />
        </Tabs>
    );
}