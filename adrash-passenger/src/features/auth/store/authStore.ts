// src/features/auth/store/authStore.ts
// Lazy MMKV pattern — DO NOT call new MMKV() at module top level.
// The TurboModule registry isn't ready when Expo Router scans route files.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { AuthState, DriverStatus, Language, User } from '../../../types';
import { MMKVKeys } from '../../../constants';
import i18n from '../../../lib/i18n';

// ── Lazy MMKV ────────────────────────────────────────────────────────────────
let _mmkv: MMKV | null = null;
function getMMKV(): MMKV {
    if (!_mmkv) _mmkv = new MMKV({ id: MMKVKeys.AUTH_STORE });
    return _mmkv;
}

const mmkvStorage = {
    getItem:    (k: string) => getMMKV().getString(k) ?? null,
    setItem:    (k: string, v: string) => getMMKV().set(k, v),
    removeItem: (k: string) => getMMKV().delete(k),
};

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user:                 null,
            isAuthenticated:      false,
            hasAcceptedAgreement: false,
            agreementVersion:     null,
            preferredLanguage:    'en' as Language,
            isBiometricEnabled:   false,
            accessToken:          null,
            refreshToken:         null,

            setUser: (user: User | null) => set({ user }),

            setAuthenticated: (value: boolean) => set({ isAuthenticated: value }),

            setTokens: (accessToken: string, refreshToken: string) =>
                set({ accessToken, refreshToken }),

            clearTokens: () => set({ accessToken: null, refreshToken: null }),

            setPhone: (phone: string) =>
                set((s) => ({
                    user: s.user ? { ...s.user, phoneNumber: phone } : null,
                })),

            setDriverStatus: (status: DriverStatus) =>
                set((s) => ({
                    user: s.user ? { ...s.user, driverStatus: status } : null,
                })),

            setLanguage: (lang: Language) => {
                getMMKV().set(MMKVKeys.PREFERRED_LANGUAGE, lang);
                void i18n.changeLanguage(lang);
                set({ preferredLanguage: lang });
            },

            setBiometricEnabled: (enabled: boolean) => {
                getMMKV().set(MMKVKeys.BIOMETRIC_ENABLED, enabled);
                set({ isBiometricEnabled: enabled });
            },

            /**
             * Called after a successful POST /auth/agreements/accept.
             * Marks the agreement as accepted locally so the splash screen
             * can skip the agreement flow on next launch.
             */
            acceptAgreement: (version: string) => {
                getMMKV().set(MMKVKeys.LAST_AGREEMENT_VERSION, version);
                set({ hasAcceptedAgreement: true, agreementVersion: version });
            },

            setCustomValue: (key: string, value: string) => {
                getMMKV().set(key, value);
            },

            logout: () =>
                set({
                    user:            null,
                    isAuthenticated: false,
                    accessToken:     null,
                    refreshToken:    null,
                    // Keep agreementVersion so if they log back in with the
                    // same phone they don't have to re-read the whole doc.
                }),
        }),
        {
            name:    MMKVKeys.AUTH_STORE,
            storage: createJSONStorage(() => mmkvStorage),
            // Never persist tokens — they live in expo-secure-store only
            partialize: (s) => ({
                hasAcceptedAgreement: s.hasAcceptedAgreement,
                agreementVersion:     s.agreementVersion,
                preferredLanguage:    s.preferredLanguage,
                isBiometricEnabled:   s.isBiometricEnabled,
            }),
        },
    ),
);