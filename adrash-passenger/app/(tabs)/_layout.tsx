// app/(tabs)/_layout.tsx
// Bottom-tab navigation: Home · Trips · Rewards · Profile (exactly 4 tabs).
// All booking/search/detail sub-screens live inside this group so the tab bar
// stays visible; they are hidden from the tab strip via href: null.

import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { Colors } from '../../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
    function RenderTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
        return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
    }
    return RenderTabIcon;
}

export default function TabsLayout() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const insets = useSafeAreaInsets();

    if (!isAuthenticated) return <Redirect href="/(auth)" />;

    const tabBarHeight = 60 + insets.bottom;

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
                    paddingTop:      8,
                    elevation:       12,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
            }}
        >
            {/* ── The four visible tab items ─────────────────────────────── */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: tabIcon('home', 'home-outline'),
                }}
            />
            <Tabs.Screen
                name="my-trips"
                options={{
                    title: 'Trips',
                    tabBarIcon: tabIcon('ticket', 'ticket-outline'),
                }}
            />
            <Tabs.Screen
                name="rewards"
                options={{
                    title: 'Rewards',
                    tabBarIcon: tabIcon('trophy', 'trophy-outline'),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
                }}
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
