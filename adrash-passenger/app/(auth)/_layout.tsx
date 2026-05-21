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
            {/* Returning-user login: phone → PIN (or OTP on new device) */}
            <Stack.Screen name="phone-login" />
            {/* Legacy: pin-login is now replaced by phone-login.
                Keep the file as a redirect so any deep-links / SecureStore
                paths that still point here don't 404. */}
            <Stack.Screen name="pin-login" />
        </Stack>
    );
}