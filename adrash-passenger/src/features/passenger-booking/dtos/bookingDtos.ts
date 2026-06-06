export interface GpsPointDTO { lat: number; lng: number; }
// `gpsPolyline` is the route geometry as the backend returns it (RouteDto.gpsPolyline:
// an ordered array of {lat,lng}). `polyline` (encoded string) is legacy/unused — the
// API never sends it. Render maps from gpsPolyline.
export interface RouteDTO { id: string; originCity: string; destinationCity: string; distanceKm: number; estimatedDurationMin: number; gpsPolyline?: GpsPointDTO[]; polyline?: string | null; stops?: StopDTO[]; baseFare?: number; }
export interface PickupLocationDTO { id: string; name: string; lat: number; lng: number; description: string; sequenceOrder: number; }
export interface StopDTO { id: string; name: string; lat: number; lng: number; sequenceOrder: number; isPickup: boolean; isDropoff: boolean; }
export type TripStatusDTO = 'Scheduled' | 'InProgress' | 'Completed';
export interface TripDTO { id: string; routeId: string; departureTime: string; arrivalEstimate: string; status: TripStatusDTO; availableSeats?: number; totalSeats?: number; fare?: number; driver?: DriverDTO | null; bus?: BusDTO | null; route?: RouteDTO | null; policies?: string[]; }
export interface DriverDTO { id?: string; fullName?: string; name?: string; phone?: string; rating?: number; totalTrips?: number; }
export interface BusDTO { id?: string; plateNumber?: string; model?: string; capacity?: number; amenities?: string[]; }
export interface SeatDTO { seatNumber: number; isBooked: boolean; }
export interface PassengerDetailDTO { fullName: string; phone: string; nextOfKinName: string; nextOfKinPhone: string; }
export interface CreateBookingDTO { tripId: string; seatNumbers: number[]; pickupLocationId: string; dropoffStopId: string; pointsToRedeem: number; passengerDetails: PassengerDetailDTO[]; }
export type BookingStatusDTO = 'Pending' | 'Confirmed' | 'CheckedIn' | 'Completed' | 'Cancelled' | 'NoShow';
export interface BookingDTO { id: string; bookingReference: string; tripId: string; status: BookingStatusDTO; seatNumbers: number[]; pickupLocationId?: string; dropoffStopId?: string; totalFare: number; serviceFee?: number; rewardsDiscount?: number; qrCode?: string; expiresAt?: string; createdAt: string; updatedAt?: string; trip?: TripDTO | null; passengerDetails?: PassengerDetailDTO[]; refundStatus?: string | null; hasReview?: boolean; }
// SantimPay is the only live aggregator. ADC is a skeleton and non-functional.
// santimPayPartner picks the downstream rail that SantimPay routes through.
export type PaymentMethodDTO  = 'SantimPay' | 'ADC';
// These values are sent verbatim to SantimPay as `paymentMethod`, so they must
// match SantimPay's catalogue names exactly (server forwards them unchanged).
// Confirmed names: "Telebirr", "Cbe Birr", "M-Pesa".
export type SantimPayPartner  = 'Telebirr' | 'Cbe Birr' | 'M-Pesa';
export interface InitiatePaymentDTO { bookingId: string; method: PaymentMethodDTO; accountRef: string; santimPayPartner?: SantimPayPartner; }
export type PaymentStatusDTO = 'Pending' | 'Processing' | 'Success' | 'Failed' | 'TimedOut' | 'Expired';
export interface PaymentTransactionDTO { transactionId: string; bookingId: string; status: PaymentStatusDTO; method: PaymentMethodDTO; santimPayPartner?: SantimPayPartner; amount?: number; providerInstructions?: string; expiresAt?: string; maskedAccountRef?: string; }
export interface VerifyPaymentDTO { transactionId: string; }
export interface TripLocationDTO { lat: number; lng: number; heading: number; speed: number; timestamp?: string; currentStopId?: string; }
export interface ReviewDTO { id: string; bookingId: string; score: number; comment: string; createdAt: string; }
export interface CreateReviewDTO { bookingId: string; score: number; comment: string; }
