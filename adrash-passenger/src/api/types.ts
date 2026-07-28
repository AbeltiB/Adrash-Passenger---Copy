// src/api/types.ts
// ─── Standard API response envelope ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    errors: string[] | null;
    meta: PaginationMeta | null;
}

// Alias used by src/types/index.ts re-exports
export type ApiError = string;
export type ApiMeta  = PaginationMeta;

export interface PaginationMeta {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
}

// ─── Language enum ──────────────────────────────────────────────────────────
// "En" | "Am" | "Om" are confirmed against the live API. "So" | "Ti" | "Ar"
// are the client's best-effort codes for the 3 newly-added UI languages —
// the backend (agreements text, profile preferredLanguage / SMS templates)
// may not recognize them yet. Call sites that send this to the server treat
// a rejection as "not supported yet" and degrade gracefully rather than
// assuming these are confirmed — see src/lib/languages.ts.
export type ApiLanguage = 'En' | 'Am' | 'Om' | 'So' | 'Ti' | 'Ar';

// ─── UserDto (GET /users/me, PATCH /users/me) ───────────────────────────────
export type UserRole = 'Passenger' | 'Driver' | 'Admin';

export interface UserDto {
    id: string;
    phone: string | null;
    fullName: string | null;
    role: UserRole;
    isVerified: boolean;
    preferredLanguage: ApiLanguage;
}

// ─── UpdateMeCommand (PATCH /users/me) ─────────────────────────────────────
export interface UpdateMeCommand {
    fullName?: string | null;
    preferredLanguage?: ApiLanguage;
}

// ─── SetupProfileCommand (PATCH /auth/profile/setup) ───────────────────────
export interface SetupProfileCommand {
    firstName: string;
    lastName: string;
    role?: 'Passenger' | 'Driver';
}

export interface SetupProfileResponse {
    user: UserDto;
    tokens: TokenPair;
    driverProfileId: string | null;
    agreementRequired: boolean;
    agreementVersion: string | null;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// ─── RewardsBalanceDto (GET /rewards/balance) ──────────────────────────────
export interface RewardsBalanceDto {
    pointsBalance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    etbEquivalent: number;
    minRedemptionPoints: number;
    currency: string | null;
}

// ─── RewardsTransactionDto (GET /rewards/history) ──────────────────────────
export type RewardsTransactionType =
    | 'Earn'
    | 'Redeem'
    | 'Referral'
    | 'Adjustment'
    | 'RedeemReversal';

export interface RewardsTransactionDto {
    id: string;
    type: RewardsTransactionType;
    points: number;
    bookingId: string | null;
    tripId: string | null;
    description: string | null;
    createdAt: string;
}

// ─── ReferralCodeDto (GET /rewards/referral) ───────────────────────────────
export interface ReferralCodeDto {
    code: string | null;
    shareLink: string | null;
    timesUsed: number;
    totalPointsEarned: number;
}

// ─── NotificationPreferenceDto (GET/PATCH /notifications/preferences) ──────
export type NotificationChannel = 'InApp' | 'Sms';

export interface NotificationPreferenceDto {
    channel: NotificationChannel;
    eventType: string | null;
    isEnabled: boolean;
}

// ─── NotificationDto (GET /notifications) ───────────────────────────────────
export type NotificationEventType =
    | 'BookingConfirmed'
    | 'DriverAssigned'
    | 'BusEnRoute'
    | 'ArrivedAtPickup'
    | 'TripStarted'
    | 'TripCompleted'
    | 'RefundProcessed'
    | 'PointsEarned'
    | 'Promotional'
    | 'System';

export interface NotificationDto {
    id: string;
    title: string;
    body: string;
    eventType: NotificationEventType | null;
    isRead: boolean;
    createdAt: string;
    deepLink: string | null;
}

// ─── CancellationInfoDto (GET /bookings/{id}/cancellation-info) ─────────────
export interface CancellationInfoDto {
    bookingId: string;
    refundPercentage: number;
    refundAmountEtb: number;
    policy: string;
    canCancel: boolean;
    cutoffTime: string | null;
}