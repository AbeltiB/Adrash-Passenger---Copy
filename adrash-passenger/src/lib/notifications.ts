// src/lib/notifications.ts
// Push notification bootstrap. Called once from the root layout.
//
// The Expo push token is obtained and ready to send to the backend once
// POST /users/me/push-token is added to the API.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Show alerts, play sound, and badge the icon while the app is foregrounded.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert:  true,
        shouldPlaySound:  true,
        shouldSetBadge:   true,
        shouldShowBanner: true,
        shouldShowList:   true,
    }),
});

export async function setupNotifications(): Promise<string | null> {
    // ── Request permission ────────────────────────────────────────────────────
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    // ── Android notification channels ─────────────────────────────────────────
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name:              'Adrash',
            importance:        Notifications.AndroidImportance.HIGH,
            vibrationPattern:  [0, 250, 250, 250],
        });
        await Notifications.setNotificationChannelAsync('trips', {
            name:              'Trip updates',
            importance:        Notifications.AndroidImportance.HIGH,
            vibrationPattern:  [0, 250, 250, 250],
            sound:             'default',
        });
    }

    // ── Expo push token ───────────────────────────────────────────────────────
    try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'fb5d2114-80b9-45ee-a562-16b6c6806946',
        });
        // TODO: POST tokenData.data to /users/me/push-token when backend adds the endpoint
        return tokenData.data;
    } catch {
        return null;
    }
}

// ── Notification-tap → navigation ─────────────────────────────────────────────

export type NotificationData = {
    screen?:    'trip' | 'booking' | 'home';
    tripId?:    string;
    bookingId?: string;
};

// Push payload data is attacker-influenced (anyone holding a leaked Expo push
// token can send arbitrary `data`), so tripId is validated as a plain
// id-shaped token — no slashes, dots, or query-string characters — before
// being interpolated into a route. Anything else is treated as absent rather
// than passed through to router.push.
const SAFE_ROUTE_ID = /^[a-zA-Z0-9_-]+$/;

export function getNavigationFromNotification(
    data: Record<string, unknown>,
): string | null {
    const d = data as NotificationData;
    if (d.screen === 'trip' && typeof d.tripId === 'string' && SAFE_ROUTE_ID.test(d.tripId)) {
        return `/(tabs)/trip/${d.tripId}`;
    }
    if (d.screen === 'booking' && d.bookingId) return `/(tabs)/booking/confirmation`;
    return null;
}

export { Notifications };
