import type { CreateBookingDTO, PassengerDetailDTO, PickupLocationDTO, StopDTO } from '../dtos/bookingDtos';
import { bookingRepository } from '../repositories/bookingRepository';
import { routeService } from './routeService';

// Accepts Ethio Telecom (9...) and Safaricom Ethiopia (7...) with local 0 prefix or +251 prefix.
const ETH_PHONE = /^(\+251|0)?[79]\d{8}$/;

// Normalize any valid Ethiopian phone to E.164 (+251XXXXXXXXX).
// The server forwards phone numbers verbatim to SantimPay and other providers,
// so local-format numbers (09...) must be converted before any API call.
export function normalizePhone(raw: string): string {
    const s = raw.replace(/[\s\-()+]/g, '');
    if (/^\+251[79]\d{8}$/.test(raw.trim())) return raw.trim();
    if (/^251[79]\d{8}$/.test(s))  return `+${s}`;
    if (/^0[79]\d{8}$/.test(s))    return `+251${s.slice(1)}`;
    if (/^[79]\d{8}$/.test(s))     return `+251${s}`;
    return raw.trim();
}
export class BookingService {
  validatePassenger(p: PassengerDetailDTO) { if (!p.fullName.trim()) return 'Passenger full name is required.'; if (!ETH_PHONE.test(p.phone)) return 'Use a valid Ethiopian phone number.'; if (!p.nextOfKinName.trim()) return 'Next-of-kin name is required.'; if (!ETH_PHONE.test(p.nextOfKinPhone)) return 'Use a valid next-of-kin Ethiopian phone number.'; return null; }
  validateBooking(input: CreateBookingDTO, pickup: PickupLocationDTO | null, dropoff: StopDTO | null) { if (input.seatNumbers.length === 0) return 'Select at least one seat.'; if (input.seatNumbers.length !== input.passengerDetails.length) return 'Passenger count must match selected seats.'; if (!pickup || pickup.id !== input.pickupLocationId) return 'Pickup location must belong to this route.'; if (!routeService.isDownstream(pickup, dropoff)) return 'Dropoff must be downstream of pickup.'; const bad = input.passengerDetails.map((p) => this.validatePassenger(p)).find(Boolean); return bad ?? null; }
  calculateFare(seatCount: number, pointsToRedeem: number, farePerSeat = 650) { const subtotal = seatCount * farePerSeat; const serviceFee = Math.round(subtotal * 0.03); const rewardsDiscount = Math.min(pointsToRedeem, subtotal); return { subtotal, serviceFee, rewardsDiscount, total: subtotal + serviceFee - rewardsDiscount }; }
  create(input: CreateBookingDTO, signal?: AbortSignal) { return bookingRepository.create(input, signal); }
}
export const bookingService = new BookingService();
