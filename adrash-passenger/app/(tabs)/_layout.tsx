// app/(tabs)/_layout.tsx
// ALL screens that should display the bottom tab bar are registered here.
// The tab bar uses safe-area insets so it sits above the Android gesture
// navigation bar (edge-to-edge is enabled in app.json).

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

    if (!isAuthenticated) return <Redirect href="/(auth)/phone" />;

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
            {/* ── Main tabs ────────────────────────────────────────────── */}
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

            {/* ── Screens that show tab bar but are NOT tab items ───────
                tabBarStyle: { display: 'none' } would hide the bar;
                we want it visible so we just hide the tab button itself. */}
            <Tabs.Screen
                name="notifications"
                options={{ href: null }} // no tab button
            />
            <Tabs.Screen
                name="search/results"
                options={{ href: null }}
            />

            {/* Booking flow — tab bar stays visible throughout */}
            <Tabs.Screen name="booking/pickup"       options={{ href: null }} />
            <Tabs.Screen name="booking/seats"        options={{ href: null }} />
            <Tabs.Screen name="booking/passengers"   options={{ href: null }} />
            <Tabs.Screen name="booking/summary"      options={{ href: null }} />
            <Tabs.Screen name="booking/payment"      options={{ href: null }} />
            <Tabs.Screen name="booking/waiting"      options={{ href: null }} />
            <Tabs.Screen name="booking/confirmation" options={{ href: null }} />

            {/* Trip detail (not tracking — that's a full-screen modal) */}
            <Tabs.Screen name="trip/[id]/index"     options={{ href: null }} />
        </Tabs>
    );
}