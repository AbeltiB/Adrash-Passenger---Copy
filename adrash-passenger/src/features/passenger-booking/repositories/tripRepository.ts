import type { SeatDTO, TripLocationDTO } from '../dtos/bookingDtos';
import { getData, getPage } from '../services/apiEnvelope';
import { mapTrip } from '../services/mappers';
export interface TripFilters { page?: number; pageSize?: number; routeId?: string; from?: string; to?: string; status?: 'Scheduled' | 'InProgress' | 'Completed'; }
// list/detail fetch raw API JSON and run it through mapTrip so the app's field
// names (fare, availableSeats, driver{}, bus{}, route{}) are populated from the
// backend's (passengerFareEtb, seatsAvailable, driverName, busPlate, originCity…).
export class TripRepository { list(filters: TripFilters, signal?: AbortSignal) { return getPage<unknown>('/trips', { page: 1, pageSize: 20, status: 'Scheduled', ...filters }, signal).then((p) => ({ ...p, items: p.items.map(mapTrip) })); } detail(tripId: string, signal?: AbortSignal) { return getData<unknown>(`/trips/${tripId}`, undefined, signal).then(mapTrip); } seats(tripId: string, signal?: AbortSignal) { return getPage<SeatDTO>(`/trips/${tripId}/seats`, undefined, signal).then((p) => p.items); } latestLocation(tripId: string, signal?: AbortSignal) { return getData<TripLocationDTO>(`/trips/${tripId}/location/latest`, undefined, signal); } }
export const tripRepository = new TripRepository();
