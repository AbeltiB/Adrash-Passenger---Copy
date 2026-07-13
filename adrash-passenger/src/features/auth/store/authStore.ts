// src/features/auth/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState, DriverStatus, Language, User } from '../../../types';
import { MMKVKeys } from '../../../constants';
import i18n from '../../../lib/i18n';
import { createZustandStorage, getStorage } from '../../../lib/storage';

const authStorage = getStorage(MMKVKeys.AUTH_STORE);
const zustandStorage = createZustandStorage(MMKVKeys.AUTH_STORE);

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
            authInitialized:      false,

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
                authStorage.set(MMKVKeys.PREFERRED_LANGUAGE, lang);
                void i18n.changeLanguage(lang);
                set({ preferredLanguage: lang });
            },

            setBiometricEnabled: (enabled: boolean) => {
                authStorage.set(MMKVKeys.BIOMETRIC_ENABLED, enabled);
                set({ isBiometricEnabled: enabled });
            },

            /**
             * Called after a successful POST /auth/agreements/accept.
             * Marks the agreement as accepted locally so the splash screen
             * can skip the agreement flow on next launch.
             */
            acceptAgreement: (version: string) => {
                authStorage.set(MMKVKeys.LAST_AGREEMENT_VERSION, version);
                set({ hasAcceptedAgreement: true, agreementVersion: version });
            },

            setCustomValue: (key: string, value: string) => {
                authStorage.set(key, value);
            },

            setAuthInitialized: () => set({ authInitialized: true }),

            logout: () =>
                set({
                    user:                 null,
                    isAuthenticated:      false,
                    accessToken:          null,
                    refreshToken:         null,
                    // Reset device-global flags on every logout, not just
                    // "switch account". The device token/phone are cleared
                    // alongside this (see useLogout.ts / useDeleteAccount.ts),
                    // so the next sign-in on this device — same person or a
                    // different one on a shared device — always goes through
                    // a fresh OTP login and takes the agreement/PIN state
                    // from that response rather than a stale local cache.
                    hasAcceptedAgreement: false,
                    agreementVersion:     null,
                    isBiometricEnabled:   false,
                }),
        }),
        {
            name:    MMKVKeys.AUTH_STORE,
            storage: createJSONStorage(() => zustandStorage),
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