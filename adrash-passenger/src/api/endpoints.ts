// src/api/endpoints.ts
export const ENDPOINTS = {
    AUTH: {
        SEND_OTP:      '/auth/otp/send',
        VERIFY_OTP:    '/auth/otp/verify',
        SETUP_PROFILE: '/auth/profile/setup',
        SETUP_PIN:     '/auth/pin/setup',
        VERIFY_PIN:    '/auth/pin/verify',
        REFRESH:       '/auth/refresh',
        LOGOUT:        '/auth/logout',
        // NOTE: passengers authenticate via OTP/PIN only — there is no
        // /auth/login or /auth/me. Profile is GET /users/me (see USERS.ME).
    },
    USERS: {
        ME: '/users/me',
    },
    ROUTES: {
        LIST:             '/routes',
        DETAIL:           (id: string) => `/routes/${id}`,
        // Seat availability is per-TRIP: see TRIPS.SEATS (/trips/{id}/seats).
        PICKUP_LOCATIONS: (id: string) => `/routes/${id}/pickup-locations`,
    },
    TRIPS: {
        LIST:            '/trips',
        DETAIL:          (id: string) => `/trips/${id}`,
        SEATS:           (id: string) => `/trips/${id}/seats`,
        LATEST_LOCATION: (id: string) => `/trips/${id}/location/latest`,
    },
    BOOKINGS: {
        CREATE:            '/bookings',
        LIST:              '/bookings',
        DETAIL:            (id: string) => `/bookings/${id}`,
        // Cancel is DELETE /bookings/{id} (no /cancel sub-path).
        CANCEL:            (id: string) => `/bookings/${id}`,
        CANCELLATION_INFO: (id: string) => `/bookings/${id}/cancellation-info`,
    },
    PAYMENTS: {
        INITIATE: '/payments/initiate',
        // Status re-check is POST /payments/verify (no GET /{id}/status).
        VERIFY:   '/payments/verify',
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
        LIST:         '/notifications',
        MARK_READ:    (id: string) => `/notifications/${id}/read`,
        MARK_ALL_READ: '/notifications/read-all',
        PREFERENCES:  '/notifications/preferences',
    },
    AGREEMENTS: {
        CURRENT: '/auth/agreements/current',
        ACCEPT:  '/auth/agreements/accept',
    },
} as const;