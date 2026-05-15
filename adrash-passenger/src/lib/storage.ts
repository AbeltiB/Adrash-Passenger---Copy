// src/lib/storage.ts
// ─── MMKV-backed generic key/value storage helpers ──────────────────────────
// Uses a lazy singleton pattern — the MMKV instance is created on first use,
// NOT at module evaluation time.  This prevents the TurboModule crash that
// occurs when react-native-mmkv 3.x is imported before the New Architecture
// runtime is fully initialised.

import { MMKV } from 'react-native-mmkv';

let _storage: MMKV | null = null;

/** Shared MMKV instance for miscellaneous app-level persistence. */
function getStorage(): MMKV {
    if (!_storage) {
        _storage = new MMKV({ id: 'app' });
    }
    return _storage;
}

// Export a proxy so callers can still write `storage.getString(...)` etc.
// The proxy forwards every property access to the lazy instance.
export const storage = new Proxy({} as MMKV, {
    get(_target, prop) {
        const instance = getStorage();
        const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
        return typeof value === 'function' ? value.bind(instance) : value;
    },
});

// ─── Typed helpers ────────────────────────────────────────────────────────────

export function readString(key: string): string | null {
    return getStorage().getString(key) ?? null;
}

export function writeString(key: string, value: string): void {
    getStorage().set(key, value);
}

export function readBoolean(key: string): boolean | null {
    const raw = getStorage().getBoolean(key);
    return raw === undefined ? null : raw;
}

export function writeBoolean(key: string, value: boolean): void {
    getStorage().set(key, value);
}

export function readNumber(key: string): number | null {
    const raw = getStorage().getNumber(key);
    return raw === undefined ? null : raw;
}

export function writeNumber(key: string, value: number): void {
    getStorage().set(key, value);
}

export function removeKey(key: string): void {
    getStorage().delete(key);
}

export function clearAll(): void {
    getStorage().clearAll();
}