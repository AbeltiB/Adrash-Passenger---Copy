import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { User } from '../../../types';
import type { SupportedLanguage } from '../../../lib/i18n';

const mmkv = new MMKV({ id: 'auth' });
const storage = {
    getItem: (k: string) => mmkv.getString(k) ?? null,
    setItem: (k: string, v: string) => mmkv.set(k, v),
    removeItem: (k: string) => mmkv.delete(k),
};

interface AuthState {
    // ─ State ─────────────────────────────────
    user: User | null;
    isAuthenticated: boolean;
    hasAcceptedAgreement: boolean;
    agreementVersion: string | null;  // track T&C version
    preferredLanguage: SupportedLanguage;
    // ─ Actions ───────────────────────────────
    setUser: (user: User | null) => void;
    setAuthenticated: (v: boolean) => void;
    acceptAgreement: (version: string) => void;
    setLanguage: (lang: SupportedLanguage) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            hasAcceptedAgreement: false,
            agreementVersion: null,
            preferredLanguage: 'en',

            setUser: (user) => set({ user }),
            setAuthenticated: (v) => set({ isAuthenticated: v }),
            acceptAgreement: (version) => set({ hasAcceptedAgreement: true, agreementVersion: version }),
            setLanguage: (lang) => set({ preferredLanguage: lang }),
            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: 'auth',
            storage: createJSONStorage(() => storage),
            // Only persist non-sensitive fields — tokens stay in SecureStore
            partialize: (s) => ({
                hasAcceptedAgreement: s.hasAcceptedAgreement,
                agreementVersion: s.agreementVersion,
                preferredLanguage: s.preferredLanguage,
            }),
        },
    ),
);