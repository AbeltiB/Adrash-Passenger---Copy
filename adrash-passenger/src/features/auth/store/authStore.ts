import { create } from 'zustand';
import type { AuthState, DriverStatus, Language } from '../../../types/index';
import { MMKVKeys } from '../../constants';
import { storage } from '../../lib/storage';
// changeLanguage is imported lazily to avoid circular deps at module init time

interface AuthActions {
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
  setUserId: (userId: string) => void;
  setPhone: (phone: string) => void;
  setDriverStatus: (status: DriverStatus) => void;
  /**
   * Persist a language preference and switch i18n synchronously.
   * For the splash screen flow use the `changeLanguage` helper from i18n.ts
   * directly (awaited) to ensure navigation waits for the switch.
   */
  setLanguage: (lang: Language) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setLastAgreementVersion: (version: string) => void;
  setAuthenticated: (value: boolean) => void;
  reset: () => void;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  phone: null,
  preferredLanguage:
    (storage.getString(MMKVKeys.PREFERRED_LANGUAGE) as Language) ?? 'en',
  driverStatus: null,
  isAuthenticated: false,
  biometricEnabled: storage.getBool(MMKVKeys.BIOMETRIC_ENABLED) ?? false,
  lastAgreementVersionAccepted:
    storage.getString(MMKVKeys.LAST_AGREEMENT_VERSION) ?? null,
};

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  ...initialState,

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  clearTokens: () => {
    set({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      userId: null,
      driverStatus: null,
    });
  },

  setUserId: (userId) => set({ userId }),

  setPhone: (phone) => set({ phone }),

  setDriverStatus: (status) => set({ driverStatus: status }),

  setLanguage: (lang) => {
    // 1. Persist preference
    storage.setString(MMKVKeys.PREFERRED_LANGUAGE, lang);
    // 2. Update Zustand state (triggers re-renders that read preferredLanguage)
    set({ preferredLanguage: lang });
    // 3. Tell i18n to switch — lazy import prevents circular dep at init
    //    This is fire-and-forget from the store; callers that need to await
    //    (e.g. splash screen before navigation) should import changeLanguage
    //    from i18n.ts directly and await it themselves.
    import('../../lib/i18n').then(({ changeLanguage }) => {
      changeLanguage(lang).catch(console.error);
    });
  },

  setBiometricEnabled: (enabled) => {
    storage.setBool(MMKVKeys.BIOMETRIC_ENABLED, enabled);
    set({ biometricEnabled: enabled });
  },

  setLastAgreementVersion: (version) => {
    storage.setString(MMKVKeys.LAST_AGREEMENT_VERSION, version);
    set({ lastAgreementVersionAccepted: version });
  },

  setAuthenticated: (value) => set({ isAuthenticated: value }),

  reset: () => set({ ...initialState, isAuthenticated: false }),
}));