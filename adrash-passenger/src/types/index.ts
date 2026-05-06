import type { ApiResponse, ApiError, ApiMeta } from '../api/types';

// Re-export envelope types
export type { ApiResponse, ApiError, ApiMeta };

// ─── Localisation ─────────────────────────────────────────────────────────────
/** Supported UI languages — mirrors SupportedLanguage in src/lib/i18n.ts */
export type Language = 'en' | 'am' | 'om';

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Online/offline status of the currently authenticated driver.
 * Passenger app uses this when showing driver info on a booked trip.
 */
export type DriverStatus = 'online' | 'offline' | 'on_trip' | 'unavailable';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    createdAt: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds
}

export interface OtpSendRequest { phoneNumber: string }
export interface OtpVerifyRequest { phoneNumber: string; otp: string }
export interface OtpVerifyResponse {
    tokens: AuthTokens;
    user: User;
    isNewUser: boolean;
}
export interface SetupProfileRequest { firstName: string; lastName: string }

/**
 * Shape of the Zustand auth slice — exported so authStore.ts can import it
 * directly from types rather than declaring it inline.
 */
export interface AuthState {
    // ─ Persisted state ────────────────────────────────────────────────────
    user: User | null;
    isAuthenticated: boolean;
    hasAcceptedAgreement: boolean;
    agreementVersion: string | null;
    preferredLanguage: Language;
    isBiometricEnabled: boolean;
    // ─ Session-only state ─────────────────────────────────────────────────
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

// ─── Route / Search ───────────────────────────────────────────────────────────
export interface RouteSearchParams {
    origin?: string;
    destination?: string;
    date?: string;    // ISO date
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
    duration: number;   // minutes
    distance: number;   // km
    fare: number;       // ETB
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
    price: number; // ETB
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
    additionalFare: number; // ETB
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
    total: number; // ETB
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
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface InitiatePaymentRequest {
    bookingId: string;
    provider: PaymentProvider;
    amount: number; // ETB
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
    rating: number;       // 1-5
    comment?: string;
}

export interface CancellationInfo {
    canCancel: boolean;
    reason?: string;
    refundAmount: number; // ETB
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
    eta: string;           // ISO datetime
    etaMinutes: number;
    nextStop: Stop | null;
}

// ─── Rewards ──────────────────────────────────────────────────────────────────
export type RewardTransactionType = 'earned' | 'redeemed' | 'expired';

export interface RewardsBalance {
    points: number;
    monetaryValue: number; // ETB
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