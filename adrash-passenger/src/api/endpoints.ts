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
    // Routes/Trips/Bookings/Payments/Reviews are called via
    // features/passenger-booking's own repositories (routeRepository.ts,
    // tripRepository.ts, bookingRepository.ts), which build their paths
    // directly rather than through this registry — kept here previously but
    // removed since they were unused and one (BOOKINGS.CANCEL) no longer
    // matched the real DELETE /bookings/{id} call, which is a landmine for
    // a future refactor that assumes this file is authoritative.
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