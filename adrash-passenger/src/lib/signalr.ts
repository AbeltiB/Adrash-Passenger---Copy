import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '../features/auth/utils/token';

const HUB_URL =
    process.env.EXPO_PUBLIC_SIGNALR_HUB_URL ?? 'https://api.adrash.app/hubs/tracking';

let _hub: signalR.HubConnection | null = null;

/** Get (or lazily build) the hub connection — call startConnection() before use. */
export function getHub(): signalR.HubConnection {
    if (!_hub) {
        _hub = buildConnection();
    }
    return _hub;
}

// accessTokenFactory is re-invoked by the signalr client on every
// (re)connect/negotiate attempt, so reading the token fresh here — rather
// than capturing one value at connection-build time — means a long tracking
// session that outlives the access-token TTL still authenticates correctly
// on automatic reconnect instead of silently retrying with a stale token.
function buildConnection(): signalR.HubConnection {
    return new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, { accessTokenFactory: async () => (await getAccessToken()) ?? '' })
        .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
        .configureLogging(__DEV__ ? signalR.LogLevel.Information : signalR.LogLevel.Error)
        .build();
}

export async function startTracking(): Promise<signalR.HubConnection> {
    await stopTracking(); // always start clean
    _hub = buildConnection();
    await _hub.start();
    return _hub;
}

export async function stopTracking(): Promise<void> {
    if (_hub?.state === signalR.HubConnectionState.Connected) {
        await _hub.stop();
    }
    _hub = null;
}