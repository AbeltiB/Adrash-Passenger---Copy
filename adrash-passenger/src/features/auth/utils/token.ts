import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../../../types';

const KEYS = {
    ACCESS: 'adrash_at',
    REFRESH: 'adrash_rt',
    EXPIRY: 'adrash_exp',
    DEVICE: 'adrash_device_token',
    DEVICE_PHONE: 'adrash_device_phone',
} as const;

export async function storeTokens(tokens: AuthTokens): Promise<void> {
    const expiresAt = Date.now() + tokens.expiresIn * 1_000;
    const writes = [
        SecureStore.setItemAsync(KEYS.ACCESS, tokens.accessToken),
        SecureStore.setItemAsync(KEYS.EXPIRY, String(expiresAt)),
    ];

    if (tokens.refreshToken) {
        writes.push(SecureStore.setItemAsync(KEYS.REFRESH, tokens.refreshToken));
    }

    await Promise.all(writes);
}

/**
 * Convert the backend's camelCase TokenPair (absolute expiry timestamps) into
 * the app's AuthTokens (relative expiresIn seconds). The API returns
 * accessTokenExpiresAt, not an OAuth expires_in, so derive the duration here.
 */
export function authTokensFromPair(tp: {
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiresAt?: string;
}): AuthTokens {
    const expiresIn = tp.accessTokenExpiresAt
        ? Math.max(0, Math.floor((new Date(tp.accessTokenExpiresAt).getTime() - Date.now()) / 1000))
        : 15 * 60; // backend default access-token lifetime is 15 min
    return {
        accessToken: tp.accessToken,
        ...(tp.refreshToken ? { refreshToken: tp.refreshToken } : {}),
        expiresIn,
    };
}

export async function getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH);
}

export async function isTokenExpired(): Promise<boolean> {
    const exp = await SecureStore.getItemAsync(KEYS.EXPIRY);
    if (!exp) return true;
    return Date.now() >= Number(exp);
}

export async function clearTokens(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(KEYS.ACCESS),
        SecureStore.deleteItemAsync(KEYS.REFRESH),
        SecureStore.deleteItemAsync(KEYS.EXPIRY),
    ]);
}


export async function storeDeviceToken(deviceToken: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.DEVICE, deviceToken);
}

export async function getDeviceToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.DEVICE);
}

export async function storeDevicePhone(phone: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.DEVICE_PHONE, phone);
}

export async function getDevicePhone(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.DEVICE_PHONE);
}

export async function clearAllSecureData(): Promise<void> {
    await Promise.all([
        clearTokens(),
        SecureStore.deleteItemAsync(KEYS.DEVICE),
        SecureStore.deleteItemAsync(KEYS.DEVICE_PHONE),
    ]);
}
