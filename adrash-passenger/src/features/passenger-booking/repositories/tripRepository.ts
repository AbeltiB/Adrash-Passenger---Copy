import type { SeatDTO, TripDTO, TripLocationDTO } from '../dtos/bookingDtos';
import { getData, getPage } from '../services/apiEnvelope';
export interface TripFilters { page?: number; pageSize?: number; routeId?: string; from?: string; to?: string; status?: 'Scheduled' | 'InProgress' | 'Completed'; }
export class TripRepository { list(filters: TripFilters, signal?: AbortSignal) { return getPage<TripDTO>('/trips', { page: 1, pageSize: 20, status: 'Scheduled', ...filters }, signal); } detail(tripId: string, signal?: AbortSignal) { return getData<TripDTO>(`/trips/${tripId}`, undefined, signal); } seats(tripId: string, signal?: AbortSignal) { return getPage<SeatDTO>(`/trips/${tripId}/seats`, undefined, signal).then((p) => p.items); } latestLocation(tripId: string, signal?: AbortSignal) { return getData<TripLocationDTO>(`/trips/${tripId}/location/latest`, undefined, signal); } }
export const tripRepository = new TripRepository();
