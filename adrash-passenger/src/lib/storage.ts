// ─── MMKV-backed generic key/value storage helpers ──────────────────────────
// This is the module that app/_layout.tsx (and any other file) can import as
//   import { storage, readString, writeString } from '../src/lib/storage'
//
// The auth and booking Zustand stores each create their OWN MMKV instance
// (id: 'auth' / 'booking') via zustand/persist.  This module exposes a
// separate shared instance for ad-hoc reads and writes (e.g. language pref,
// onboarding flags) that don't belong to a specific store.

import { MMKV } from 'react-native-mmkv';

/** Shared MMKV instance for miscellaneous app-level persistence. */
export const storage = new MMKV({ id: 'app' });

// ─── Typed helpers ────────────────────────────────────────────────────────────

export function readString(key: string): string | null {
    return storage.getString(key) ?? null;
}

export function writeString(key: string, value: string): void {
    storage.set(key, value);
}

export function readBoolean(key: string): boolean | null {
    const raw = storage.getBoolean(key);
    return raw === undefined ? null : raw;
}

export function writeBoolean(key: string, value: boolean): void {
    storage.set(key, value);
}

export function readNumber(key: string): number | null {
    const raw = storage.getNumber(key);
    return raw === undefined ? null : raw;
}

export function writeNumber(key: string, value: number): void {
    storage.set(key, value);
}

export function removeKey(key: string): void {
    storage.delete(key);
}

export function clearAll(): void {
    storage.clearAll();
}