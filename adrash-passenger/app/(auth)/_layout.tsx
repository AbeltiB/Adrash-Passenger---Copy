import { Stack } from 'expo-router';

// NOTE: Auth guard (redirect if authenticated) is handled at the
// individual screen level or via the root layout's initial route.
// Putting a <Redirect> directly inside a Stack layout causes
// "Attempted to navigate before mounting the Root Layout" errors.

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="agreement" />
            <Stack.Screen name="phone" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="setup" />
        </Stack>
    );
}