// API → app DTO mappers.
//
// The repositories cast raw API JSON straight onto our DTO types, so any field
// the backend names differently silently arrives as `undefined`. The backend
// (Adrash.API) ships camelCase but uses *different field names* than the app
// historically assumed — most visibly the trip price:
//
//   API trip     → app TripDTO
//   passengerFareEtb (per-seat, commission baked in) → fare
//   seatsAvailable                                   → availableSeats
//   seatsTotal                                       → totalSeats
//   driverName / driverPhone / driverId (flat)       → driver { fullName, phone, id }
//   busPlate / busId (flat)                          → bus { plateNumber, id }
//   originCity / destinationCity (flat, summary)     → route { originCity, destinationCity }
//
//   API booking  → app BookingDTO
//   bookingRef    → bookingReference
//   totalFareEtb  → totalFare
//   qrCodeData    → qrCode
//
// These mappers normalize both shapes (flat API + any already-nested legacy
// payload) so every screen keeps reading trip.fare / booking.totalFare etc.

import type { BookingDTO, BusDTO, DriverDTO, RouteDTO, TripDTO } from '../dtos/bookingDtos';

type Raw = Record<string, unknown>;

function asRaw(v: unknown): Raw {
    return v && typeof v === 'object' ? (v as Raw) : {};
}

/** Coerce a number-ish value (number or numeric string) or return undefined. */
function num(v: unknown): number | undefined {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    return undefined;
}

function str(v: unknown): string | undefined {
    return typeof v === 'string' ? v : undefined;
}

/**
 * Drop keys whose value is `undefined`, then assert the target type. The app's
 * DTOs use `exactOptionalPropertyTypes`, so an optional field must be omitted
 * rather than explicitly set to `undefined`.
 */
function compact<T>(obj: Raw): T {
    const out: Raw = {};
    for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k];
    return out as T;
}

export function mapTrip(raw: unknown): TripDTO {
    const r = asRaw(raw);

    // Driver: detail endpoint returns flat driverName/driverPhone/driverId.
    const driver: DriverDTO | undefined =
        r.driver !== undefined
            ? (r.driver as DriverDTO)
            : r.driverName || r.driverId
              ? compact<DriverDTO>({ id: str(r.driverId), fullName: str(r.driverName), phone: str(r.driverPhone) })
              : undefined;

    // Bus: detail endpoint returns flat busPlate/busId (no model/capacity).
    const bus: BusDTO | undefined =
        r.bus !== undefined
            ? (r.bus as BusDTO)
            : r.busPlate || r.busId
              ? compact<BusDTO>({ id: str(r.busId), plateNumber: str(r.busPlate) })
              : undefined;

    // Route: summary returns flat originCity/destinationCity; detail returns only routeId.
    const route: RouteDTO | undefined =
        r.route !== undefined
            ? (r.route as RouteDTO)
            : r.originCity || r.destinationCity
              ? {
                    id: str(r.routeId) ?? '',
                    originCity: str(r.originCity) ?? '',
                    destinationCity: str(r.destinationCity) ?? '',
                    distanceKm: num(r.distanceKm) ?? 0,
                    estimatedDurationMin: num(r.estimatedDurationMin) ?? 0,
                }
              : undefined;

    return compact<TripDTO>({
        id: str(r.id) ?? '',
        routeId: str(r.routeId) ?? '',
        departureTime: str(r.departureTime) ?? '',
        arrivalEstimate: str(r.arrivalEstimate) ?? '',
        status: (r.status as TripDTO['status']) ?? 'Scheduled',
        // Passenger-facing per-seat price. Prefer passengerFareEtb; tolerate a
        // pre-mapped `fare`. baseFareEtb is the driver-side number — never show it.
        fare: num(r.passengerFareEtb) ?? num(r.fare),
        availableSeats: num(r.seatsAvailable) ?? num(r.availableSeats),
        totalSeats: num(r.seatsTotal) ?? num(r.totalSeats),
        driver,
        bus,
        route,
        policies: Array.isArray(r.policies) ? (r.policies as string[]) : undefined,
    });
}

export function mapBooking(raw: unknown): BookingDTO {
    const r = asRaw(raw);

    // Synthesize a minimal nested trip from the flat booking fields the API
    // returns, so screens reading booking.trip?.route keep working.
    const trip: TripDTO | undefined =
        r.trip !== undefined
            ? mapTrip(r.trip)
            : r.tripId
              ? mapTrip({
                    id: r.tripId,
                    routeId: r.routeId,
                    departureTime: r.departureTime,
                    arrivalEstimate: r.arrivalEstimate ?? r.departureTime,
                    status: 'Scheduled',
                    originCity: r.originCity,
                    destinationCity: r.destinationCity,
                })
              : undefined;

    return compact<BookingDTO>({
        id: str(r.id) ?? '',
        bookingReference: str(r.bookingReference) ?? str(r.bookingRef) ?? '',
        tripId: str(r.tripId) ?? '',
        status: (r.status as BookingDTO['status']) ?? 'Pending',
        seatNumbers: Array.isArray(r.seatNumbers) ? (r.seatNumbers as number[]) : [],
        pickupLocationId: str(r.pickupLocationId),
        dropoffStopId: str(r.dropoffStopId),
        // Final amount the passenger pays. Backend field is totalFareEtb.
        totalFare: num(r.totalFareEtb) ?? num(r.totalFare) ?? 0,
        serviceFee: num(r.serviceFee),
        rewardsDiscount: num(r.rewardsDiscount),
        qrCode: str(r.qrCode) ?? str(r.qrCodeData),
        expiresAt: str(r.expiresAt),
        createdAt: str(r.createdAt) ?? '',
        updatedAt: str(r.updatedAt),
        trip,
        passengerDetails: Array.isArray(r.passengerDetails)
            ? (r.passengerDetails as BookingDTO['passengerDetails'])
            : undefined,
        refundStatus: str(r.refundStatus) ?? null,
        hasReview: typeof r.hasReview === 'boolean' ? r.hasReview : undefined,
    });
}
