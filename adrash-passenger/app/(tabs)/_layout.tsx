// app/(tabs)/_layout.tsx
// Auth guard lives here — if not authenticated, redirect to phone screen.
// Screens are named to match the actual files under app/(tabs)/.
import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
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

    // Guard: unauthenticated users get sent to phone OTP screen
    if (!isAuthenticated) return <Redirect href="/(auth)/phone" />;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor:   Colors.brand.primary,
                tabBarInactiveTintColor: Colors.neutral.gray400,
                tabBarStyle: {
                    backgroundColor: Colors.background.primary,
                    borderTopColor:  Colors.border.light,
                    height: 64,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }}
            />
            {/* File is my-trips.tsx — must match exactly */}
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
        </Tabs>
    );
}