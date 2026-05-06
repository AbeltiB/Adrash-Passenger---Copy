import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { Colors } from '../../src/constants';

const tabIcon = (emoji: string) => ({ color }: { color: string }) => (
    <Text style={{ fontSize: 22, color }}>{emoji}</Text>
);

export default function TabsLayout() {
    const { isAuthenticated } = useAuthStore();
    if (!isAuthenticated) return <Redirect href="/(auth)/phone" />;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.brand.primary,
                tabBarInactiveTintColor: Colors.neutral.gray400,
                tabBarStyle: {
                    backgroundColor: Colors.background.primary,
                    borderTopColor: Colors.border.light,
                    height: 64,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }} />
            <Tabs.Screen name="my-trips" options={{ title: 'Trips', tabBarIcon: tabIcon('🎫') }} />
            <Tabs.Screen name="rewards" options={{ title: 'Rewards', tabBarIcon: tabIcon('🎁') }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }} />
        </Tabs>
    );
}
