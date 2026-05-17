// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="agreement" />
            <Stack.Screen name="phone" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="setup" />
            <Stack.Screen name="pin-setup" />
        </Stack>
    );
}