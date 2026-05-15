// src/features/auth/store/authStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central authentication + session store.
//
// KEY FIX: The MMKV instance must NOT be created at module top-level when
// using react-native-mmkv 3.x with New Architecture.  Instead we create it
// lazily inside the store initialiser so it's only constructed after the
// TurboModule registry is ready.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { User, AuthState, DriverStatus, Language } from '../../../types';
import { MMKVKeys } from '../../../constants';
import i18n from '../../../lib/i18n';

// ─── Lazy MMKV instance ───────────────────────────────────────────────────────
// DO NOT call `new MMKV()` at the top of the module.  The TurboModule may not
// be registered yet when the module is first evaluated (during route scanning),
// which is exactly the crash you're seeing in the logs.
let _mmkv: MMKV | null = null;

function getMMKV(): MMKV {
    if (!_mmkv) {
        _mmkv = new MMKV({ id: MMKVKeys.AUTH_STORE });
    }
    return _mmkv;
}

// ─── Zustand-compatible storage adapter ──────────────────────────────────────
const mmkvStorage = {
    getItem:    (k: string) => getMMKV().getString(k) ?? null,
    setItem:    (k: string, v: string) => getMMKV().set(k, v),
    removeItem: (k: string) => getMMKV().delete(k),
};

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // ─ Initial state ───────────────────────────────────────────────
            user:                  null,
            isAuthenticated:       false,
            hasAcceptedAgreement:  false,
            agreementVersion:      null,
            preferredLanguage:     'en' as Language,
            isBiometricEnabled:    false,
            accessToken:           null,
            refreshToken:          null,

            // ─ Actions ────────────────────────────────────────────────────

            setUser: (user: User | null) =>
                set({ user }),

            setAuthenticated: (value: boolean) =>
                set({ isAuthenticated: value }),

            setTokens: (accessToken: string, refreshToken: string) =>
                set({ accessToken, refreshToken }),

            clearTokens: () =>
                set({ accessToken: null, refreshToken: null }),

            setPhone: (phone: string) =>
                set((state) => ({
                    user: state.user ? { ...state.user, phoneNumber: phone } : null,
                })),

            setDriverStatus: (status: DriverStatus) =>
                set((state) => ({
                    user: state.user ? { ...state.user, driverStatus: status } : null,
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
                }),
        }),
        {
            name:    MMKVKeys.AUTH_STORE,
            storage: createJSONStorage(() => mmkvStorage),
            // Only persist non-sensitive fields — tokens stay in SecureStore
            partialize: (s) => ({
                hasAcceptedAgreement: s.hasAcceptedAgreement,
                agreementVersion:     s.agreementVersion,
                preferredLanguage:    s.preferredLanguage,
                isBiometricEnabled:   s.isBiometricEnabled,
            }),
        },
    ),
);