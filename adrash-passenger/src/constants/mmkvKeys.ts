// ─── MMKV Storage Key Registry ──────────────────────────────────────────────
// All MMKV storage keys are centralised here so there is a single source of
// truth and no magic-string typos across the codebase.

export const MMKVKeys = {
    // Auth store (MMKV id: 'auth')
    AUTH_STORE: 'auth',

    // Booking work-in-progress store (MMKV id: 'booking')
    BOOKING_STORE: 'booking-wip',

    // Per-key entries written directly (not via zustand/persist)
    PREFERRED_LANGUAGE: 'preferred_language',
    AGREEMENT_ACCEPTED: 'agreement_accepted',
    AGREEMENT_VERSION: 'agreement_version',

    // Alias used by the expanded authStore (distinct from AGREEMENT_VERSION
    // so the two can be versioned independently if needed)
    LAST_AGREEMENT_VERSION: 'last_agreement_version',

    ONBOARDING_COMPLETE: 'onboarding_complete',

    // Biometric login preference — stored as a boolean
    BIOMETRIC_ENABLED: 'biometric_enabled',
} as const;

export type MMKVKey = (typeof MMKVKeys)[keyof typeof MMKVKeys];