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
        LOGIN:         '/auth/login',
        ME:            '/auth/me',
    },
    USERS: {
        ME: '/users/me',
    },
    ROUTES: {
        LIST:             '/routes',
        SEARCH:           '/routes/search',
        DETAIL:           (id: string) => `/routes/${id}`,
        SEAT_MAP:         (id: string) => `/routes/${id}/seat-map`,
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
        CANCEL:            (id: string) => `/bookings/${id}/cancel`,
        CANCELLATION_INFO: (id: string) => `/bookings/${id}/cancellation-info`,
    },
    PAYMENTS: {
        INITIATE: '/payments/initiate',
        STATUS:   (paymentId: string) => `/payments/${paymentId}/status`,
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
        PREFERENCES: '/notifications/preferences',
    },
    AGREEMENTS: {
        CURRENT: '/auth/agreements/current',
        ACCEPT:  '/auth/agreements/accept',
    },
} as const;