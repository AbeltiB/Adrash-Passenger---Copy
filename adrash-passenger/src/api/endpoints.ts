// src/api/endpoints.ts
export const ENDPOINTS = {
    AUTH: {
        SEND_OTP:      '/auth/send-otp',
        VERIFY_OTP:    '/auth/verify-otp',
        SETUP_PROFILE: '/auth/profile/setup',
        REFRESH:       '/auth/refresh',
        LOGOUT:        '/auth/logout',
        LOGIN:         '/auth/login',       // ← added: used by useLogin.ts
        ME:            '/auth/me',          // ← added: used by useCurrentUser.ts / useLogin.ts
    },
    USERS: {
        ME: '/users/me',   // GET → profile, PATCH → update, DELETE → delete account
    },
    ROUTES: {
        SEARCH:           '/routes/search',
        DETAIL:           (id: string) => `/routes/${id}`,
        SEAT_MAP:         (id: string) => `/routes/${id}/seat-map`,
        PICKUP_LOCATIONS: (id: string) => `/routes/${id}/pickup-locations`,
    },
    BOOKINGS: {
        CREATE:            '/bookings',
        LIST:              '/bookings',
        DETAIL:            (id: string) => `/bookings/${id}`,
        CANCEL:            (id: string) => `/bookings/${id}/cancel`,
        CANCELLATION_INFO: (id: string) => `/bookings/${id}/cancellation-info`,
    },
    PAYMENTS: {
        INITIATE: '/payments/initiate',
        STATUS:   (paymentId: string) => `/payments/${paymentId}/status`,
    },
    REVIEWS: {
        SUBMIT: '/reviews',
    },
    REWARDS: {
        BALANCE:  '/rewards/balance',
        HISTORY:  '/rewards/history',
        REDEEM:   '/rewards/redeem',
        REFERRAL: '/rewards/referral',
    },
    NOTIFICATIONS: {
        PREFERENCES: '/notifications/preferences',   // GET + PATCH
    },
    // ── Agreements ──────────────────────────────────────────────────────────────
    // Used by src/features/agreements/hooks/useAgreements.ts
    AGREEMENTS: {
        CURRENT: '/auth/agreements/current',
        ACCEPT: '/auth/agreements/accept',
    },
} as const;