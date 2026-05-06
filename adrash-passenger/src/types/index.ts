import type { ApiResponse, ApiError, ApiMeta } from '../api/types';

// Re-export envelope types used by legacy endpoints that still wrap responses.
export type { ApiResponse, ApiError, ApiMeta };

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'USER' | string;

export interface User {
    id: string;
    username: string;
    roles: UserRole[];
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface RefreshTokenRequest { refresh_token: string }
export interface RefreshTokenResponse {
    access_token: string;
    expires_in: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number; // seconds
}


export interface OtpSendRequest { phoneNumber: string }
export interface OtpVerifyRequest { phoneNumber: string; otp: string }
export interface OtpVerifyResponse {
    tokens: AuthTokens | LoginResponse;
    user: User;
    isNewUser?: boolean;
}
export interface SetupProfileRequest { firstName: string; lastName: string }

// ─── Agreements ───────────────────────────────────────────────────────────────
export type AgreementStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'INACTIVE' | string;

export interface AgreementSummary {
    id: string;
    title: string;
    status: AgreementStatus;
    startDate: string;
    endDate: string;
}

export interface AgreementDocument {
    id: string;
    title: string;
    content: string;
    status: AgreementStatus;
    signed: boolean;
}

export interface CreateAgreementRequest {
    title: string;
    content: string;
    startDate: string;
    endDate: string;
}

export interface UpdateAgreementRequest {
    title: string;
    content: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface SignAgreementResponse {
    agreementId: string;
    signedAt: string;
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

// ─── Trips / Tracking ─────────────────────────────────────────────────────────
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
