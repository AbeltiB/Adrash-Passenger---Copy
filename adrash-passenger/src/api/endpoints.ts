export const ENDPOINTS = {
  AUTH: {
    LOGIN:         '/auth/login',
    SEND_OTP:      '/auth/send-otp',
    VERIFY_OTP:    '/auth/verify-otp',
    REFRESH:       '/auth/refresh',
    LOGOUT:        '/auth/logout',
    ME:            '/auth/me',
    SETUP_PROFILE: '/auth/setup-profile',
  },
  AGREEMENTS: {
    LIST:      '/agreements',
    DETAIL:    (agreementId: string) => `/agreements/${agreementId}`,
    CREATE:    '/agreements',
    UPDATE:    (agreementId: string) => `/agreements/${agreementId}`,
    SIGN:      (agreementId: string) => `/agreements/${agreementId}/sign`,
    SIGNED_ME: '/agreements/signed/me',
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
  USER: {
    PROFILE:         '/user/profile',
    UPDATE_PROFILE:  '/user/profile',
    SAVED_LOCATIONS: '/user/saved-locations',
  },
} as const;
