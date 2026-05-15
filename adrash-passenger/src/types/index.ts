// src/types/index.ts
import type { ApiResponse, ApiError, ApiMeta } from '../api/types';

// Re-export envelope types
export type { ApiResponse, ApiError, ApiMeta };

// ─── Localisation ─────────────────────────────────────────────────────────────
/** Supported UI languages */
export type Language = 'en' | 'am' | 'om';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type DriverStatus = 'online' | 'offline' | 'on_trip' | 'unavailable';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    createdAt: string;
    /** Optional — set when driver status is surfaced on a trip */
    driverStatus?: DriverStatus;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;   // optional: not returned on every call (e.g. token refresh)
    expiresIn: number;       // seconds
}

// ── OTP ──────────────────────────────────────────────────────────────────────
export interface OtpSendRequest  { phoneNumber: string }
export interface OtpVerifyRequest { phoneNumber: string; otp: string }
export interface OtpVerifyResponse {
    tokens: AuthTokens;
    user: User;
    isNewUser: boolean;
}

// ── Login (username / password — future use or admin login) ───────────────────
export interface LoginRequest {
    username: string;
    password: string;
}

/** Raw token response from the server (snake_case) */
export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

/** Raw token response from POST /auth/refresh (snake_case) */
export interface RefreshTokenResponse {
    access_token: string;
    expires_in: number;
    /** refresh_token rotation — may or may not be returned */
    refresh_token?: string;
}

export interface SetupProfileRequest { firstName: string; lastName: string }

/**
 * Full Zustand auth slice shape — imported by authStore.ts so the interface
 * stays in one place and TypeScript can verify all actions are implemented.
 */
export interface AuthState {
    // ─ Persisted ──────────────────────────────────────────────────────────
    user: User | null;
    isAuthenticated: boolean;
    hasAcceptedAgreement: boolean;
    agreementVersion: string | null;
    preferredLanguage: Language;
    isBiometricEnabled: boolean;
    // ─ Session-only ───────────────────────────────────────────────────────
    accessToken: string | null;
    refreshToken: string | null;
    // ─ Actions ────────────────────────────────────────────────────────────
    setUser: (user: User | null) => void;
    setAuthenticated: (value: boolean) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    clearTokens: () => void;
    setPhone: (phone: string) => void;
    setDriverStatus: (status: DriverStatus) => void;
    setLanguage: (lang: Language) => void;
    setBiometricEnabled: (enabled: boolean) => void;
    acceptAgreement: (version: string) => void;
    setCustomValue: (key: string, value: string) => void;
    logout: () => void;
}

// ─── Agreements ───────────────────────────────────────────────────────────────

export type AgreementStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ALL';
export type AgreementType   = 'Passenger' | 'Driver' | 'General';

export interface AgreementSummary {
    id: string;
    title: string;
    type: AgreementType;
    status: AgreementStatus;
    version: string;
    startDate: string;
    endDate: string;
    createdAt: string;
}

export interface AgreementDocument extends AgreementSummary {
    content: string;
    signed: boolean;        // true when the current user has already signed
    signedAt: string | null;
}

export interface CreateAgreementRequest {
    title: string;
    type: AgreementType;
    content: string;
    startDate: string;
    endDate: string;
}

export interface UpdateAgreementRequest extends Partial<CreateAgreementRequest> {
    status?: AgreementStatus;
}

export interface SignAgreementResponse {
    agreementId: string;
    signedAt: string;
}

// ─── Route / Search ───────────────────────────────────────────────────────────
export interface RouteSearchParams {
    origin?: string;
    destination?: string;
    date?: string;
    passengers?: number;
}

export interface Stop {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    arrivalTime: string;
    departureTime: string;
    order: number;
}

export interface Amenity { id: string; name: string; icon: string }

export interface Driver {
    id: string;
    name: string;
    rating: number;
    totalTrips: number;
    photoUrl?: string;
}

export interface BusInfo {
    plateNumber: string;
    model: string;
    capacity: number;
}

export interface Route {
    id: string;
    name: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    duration: number;
    distance: number;
    fare: number;
    availableSeats: number;
    totalSeats: number;
    amenities: Amenity[];
    stops: Stop[];
    driver: Driver;
    busInfo: BusInfo;
}

// ─── Booking ──────────────────────────────────────────────────────────────────
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Seat {
    id: string;
    number: string;
    row: number;
    column: number;
    isAvailable: boolean;
    price: number;
}

export interface SeatMap {
    rows: number;
    columns: number;
    seats: Seat[];
}

export interface PickupLocation {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    additionalFare: number;
}

export interface PassengerDetail {
    seatId: string;
    seatNumber: string;
    name: string;
    age: number;
    gender: 'male' | 'female';
}

export interface FareBreakdown {
    subtotal: number;
    serviceFee: number;
    pickupFee: number;
    discount: number;
    total: number;
}

export interface CreateBookingRequest {
    routeId: string;
    seatIds: string[];
    pickupLocationId: string;
    passengers: PassengerDetail[];
}

export interface Booking {
    id: string;
    bookingReference: string;
    routeId: string;
    route: Route;
    seats: Seat[];
    passengers: PassengerDetail[];
    pickupLocation: PickupLocation;
    status: BookingStatus;
    totalFare: number;
    serviceFee: number;
    grandTotal: number;
    qrCode: string;
    createdAt: string;
    updatedAt: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentProvider = 'telebirr' | 'cbe_birr' | 'awash';
export type PaymentStatus   = 'pending' | 'processing' | 'success' | 'failed';

export interface InitiatePaymentRequest {
    bookingId: string;
    provider: PaymentProvider;
    amount: number;
}

export interface InitiatePaymentResponse {
    paymentId: string;
    redirectUrl?: string;
    deepLinkUrl?: string;
    expiresAt: string;
}

export interface PaymentStatusResponse {
    paymentId: string;
    status: PaymentStatus;
    bookingId: string;
}

// ─── Trips ────────────────────────────────────────────────────────────────────
export type TripTab = 'upcoming' | 'completed' | 'cancelled';

export interface Trip extends Booking {
    canCancel: boolean;
    canReview: boolean;
    hasReview: boolean;
}

export interface SubmitReviewRequest {
    bookingId: string;
    rating: number;
    comment?: string;
}

export interface CancellationInfo {
    canCancel: boolean;
    reason?: string;
    refundAmount: number;
    refundPolicy: string;
}

// ─── Tracking ─────────────────────────────────────────────────────────────────
export interface BusLocation {
    busId: string;
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    timestamp: string;
}

export interface EtaUpdate {
    bookingId: string;
    eta: string;
    etaMinutes: number;
    nextStop: Stop | null;
}

// ─── Rewards ──────────────────────────────────────────────────────────────────
export type RewardTransactionType = 'earned' | 'redeemed' | 'expired';

export interface RewardsBalance {
    points: number;
    monetaryValue: number;
    expiringPoints: number;
    expiringDate: string | null;
}

export interface RewardTransaction {
    id: string;
    type: RewardTransactionType;
    points: number;
    description: string;
    createdAt: string;
}

export interface RedeemPointsRequest {
    points: number;
    bookingId?: string;
}

export interface ReferralInfo {
    code: string;
    totalReferrals: number;
    pointsEarned: number;
    shareUrl: string;
}