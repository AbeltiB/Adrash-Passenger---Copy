// src/lib/storage.ts

import { MMKV } from 'react-native-mmkv';

/**
 * react-native-mmkv is not bundled in Expo Go. Creating an MMKV instance there
 * throws because the native module is unavailable, so this adapter falls back to
 * a synchronous in-memory store. Production/dev-client builds still use MMKV.
 */
type StorageValue = string | number | boolean;

type SyncStorage = {
  getString: (key: string) => string | undefined;
  getBoolean: (key: string) => boolean | undefined;
  getNumber: (key: string) => number | undefined;
  set: (key: string, value: StorageValue) => void;
  delete: (key: string) => void;
  clearAll: () => void;
};

const instances = new Map<string, SyncStorage>();

function createMemoryStorage(): SyncStorage {
  const values = new Map<string, StorageValue>();

  return {
    getString: (key) => {
      const value = values.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getBoolean: (key) => {
      const value = values.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    getNumber: (key) => {
      const value = values.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    set: (key, value) => {
      values.set(key, value);
    },
    delete: (key) => {
      values.delete(key);
    },
    clearAll: () => {
      values.clear();
    },
  };
}

export function getStorage(id = 'app'): SyncStorage {
  const existing = instances.get(id);
  if (existing) return existing;

  let next: SyncStorage;

  try {
    next = new MMKV({ id });
  } catch {
    next = createMemoryStorage();
  }

  instances.set(id, next);
  return next;
}

export const storage = getStorage('app');

export function createZustandStorage(id: string) {
  return {
    getItem: (key: string) => getStorage(id).getString(key) ?? null,
    setItem: (key: string, value: string) => getStorage(id).set(key, value),
    removeItem: (key: string) => getStorage(id).delete(key),
  };
}

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
