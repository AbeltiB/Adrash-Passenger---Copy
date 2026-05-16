// src/lib/storage.ts

import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'app',
});

export function readString(key: string): string | null {
  return storage.getString(key) ?? null;
}

export function writeString(
  key: string,
  value: string
): void {
  storage.set(key, value);
}

export function readBoolean(
  key: string
): boolean | null {
  const raw = storage.getBoolean(key);
  return raw === undefined ? null : raw;
}

export function writeBoolean(
  key: string,
  value: boolean
): void {
  storage.set(key, value);
}

export function readNumber(
  key: string
): number | null {
  const raw = storage.getNumber(key);
  return raw === undefined ? null : raw;
}

export function writeNumber(
  key: string,
  value: number
): void {
  storage.set(key, value);
}

export function removeKey(key: string): void {
  storage.delete(key);
}

export function clearAll(): void {
  storage.clearAll();
}