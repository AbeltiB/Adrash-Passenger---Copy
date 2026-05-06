// src/features/auth/store/authStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central authentication + session store.
//
// Fixes applied vs the version on disk:
//   • AuthState / DriverStatus imported from types (errors 2305)
//   • MMKV API: getBool → getBoolean, setBool → set, setString → set (errors 2339/2551)
//   • MMKVKeys.BIOMETRIC_ENABLED + LAST_AGREEMENT_VERSION added to keys file (2339/2551)
//   • i18n import path corrected to ../../../lib/i18n (error 2307)
//   • All action parameters given explicit types (errors 7006)

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { User, AuthState, DriverStatus, Language } from '../../../types';
import { MMKVKeys } from '../../../constants';
import i18n from '../../../lib/i18n';           // ✔ corrected path (was ../../lib/i18n)

// ─── MMKV instance for this store ────────────────────────────────────────────

const mmkv = new MMKV({ id: MMKVKeys.AUTH_STORE });

// ─── Zustand-compatible storage adapter ──────────────────────────────────────

const mmkvStorage = {
    getItem:    (k: string) => mmkv.getString(k) ?? null,
    setItem:    (k: string, v: string) => mmkv.set(k, v),      // ✔ set(), not setString()
    removeItem: (k: string) => mmkv.delete(k),
};

// ─── Initial biometric preference (read once at store creation) ───────────────
// ✔ MMKV uses getBoolean(), not getBool()
// ✔ MMKVKeys.BIOMETRIC_ENABLED now exists in mmkvKeys.ts
const initialBiometric: boolean =
    mmkv.getBoolean(MMKVKeys.BIOMETRIC_ENABLED) ?? false;

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
            isBiometricEnabled:    initialBiometric,
            accessToken:           null,
            refreshToken:          null,

            // ─ Actions ────────────────────────────────────────────────────

            setUser: (user: User | null) =>
                set({ user }),

            setAuthenticated: (value: boolean) =>
                set({ isAuthenticated: value }),

            /** Store tokens in Zustand state (non-sensitive mirror).
             *  Sensitive persistence is handled by expo-secure-store via token.ts. */
            setTokens: (accessToken: string, refreshToken: string) =>
                set({ accessToken, refreshToken }),

            clearTokens: () =>
                set({ accessToken: null, refreshToken: null }),

            setPhone: (phone: string) =>
                set((state) => ({
                    user: state.user ? { ...state.user, phoneNumber: phone } : null,
                })),

            setDriverStatus: (status: DriverStatus) =>
                // DriverStatus is a passenger-facing read-only field; store it
                // on the user object so the UI can react to it.
                set((state) => ({
                    user: state.user ? { ...state.user, driverStatus: status } : null,
                })),

            setLanguage: (lang: Language) => {
                // ✔ MMKV.set() is the correct write API (was setString())
                mmkv.set(MMKVKeys.PREFERRED_LANGUAGE, lang);
                void i18n.changeLanguage(lang);
                set({ preferredLanguage: lang });
            },

            setBiometricEnabled: (enabled: boolean) => {
                // ✔ MMKV.set() accepts boolean directly (was setBool())
                // ✔ MMKVKeys.BIOMETRIC_ENABLED now declared in mmkvKeys.ts
                mmkv.set(MMKVKeys.BIOMETRIC_ENABLED, enabled);
                set({ isBiometricEnabled: enabled });
            },

            acceptAgreement: (version: string) => {
                // ✔ MMKV.set() for strings (was setString())
                // ✔ MMKVKeys.LAST_AGREEMENT_VERSION now declared in mmkvKeys.ts
                mmkv.set(MMKVKeys.LAST_AGREEMENT_VERSION, version);
                set({ hasAcceptedAgreement: true, agreementVersion: version });
            },

            /** Generic escape hatch for direct MMKV string writes from the store. */
            setCustomValue: (key: string, value: string) => {
                mmkv.set(key, value);
            },

            logout: () =>
                set({
                    user:                 null,
                    isAuthenticated:      false,
                    accessToken:          null,
                    refreshToken:         null,
                }),
        }),
        {
            name:    MMKVKeys.AUTH_STORE,
            storage: createJSONStorage(() => mmkvStorage),
            // Only persist non-sensitive fields — tokens are kept in SecureStore via token.ts
            partialize: (s) => ({
                hasAcceptedAgreement: s.hasAcceptedAgreement,
                agreementVersion:     s.agreementVersion,
                preferredLanguage:    s.preferredLanguage,
                isBiometricEnabled:   s.isBiometricEnabled,
            }),
        },
    ),
);