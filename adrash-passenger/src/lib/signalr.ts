import * as signalR from '@microsoft/signalr';

const HUB_URL =
    process.env.EXPO_PUBLIC_SIGNALR_HUB_URL ?? 'https://api.adrash.app/hubs/tracking';

let _hub: signalR.HubConnection | null = null;

/** Get (or lazily build) the hub connection — call startConnection() before use. */
export function getHub(): signalR.HubConnection {
    if (!_hub) {
        _hub = buildConnection('');
    }
    return _hub;
}

function buildConnection(accessToken: string): signalR.HubConnection {
    return new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
        .configureLogging(__DEV__ ? signalR.LogLevel.Information : signalR.LogLevel.Error)
        .build();
}

export async function startTracking(accessToken: string): Promise<signalR.HubConnection> {
    await stopTracking(); // always start clean
    _hub = buildConnection(accessToken);
    await _hub.start();
    return _hub;
}

export async function stopTracking(): Promise<void> {
    if (_hub?.state === signalR.HubConnectionState.Connected) {
        await _hub.stop();
    }
    _hub = null;
}