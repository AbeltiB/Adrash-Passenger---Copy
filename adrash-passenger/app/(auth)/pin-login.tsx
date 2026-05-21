// app/(auth)/pin-login.tsx
// Legacy route — now replaced by phone-login (phone + PIN on same screen).
// Redirects immediately so any cached navigation state or old code paths
// that point here still work without a 404.

import { Redirect } from 'expo-router';

export default function PinLoginRedirect() {
    return <Redirect href="/(auth)/phone-login" />;
}