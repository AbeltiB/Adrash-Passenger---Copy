import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../../../types';

const KEYS = {
    ACCESS: 'adrash_at',
    REFRESH: 'adrash_rt',
    EXPIRY: 'adrash_exp',
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
