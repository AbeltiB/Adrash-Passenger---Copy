import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    BookingStatusDTO,
    CreateBookingDTO,
    CreateReviewDTO,
    InitiatePaymentDTO,
} from '../dtos/bookingDtos';
import { bookingRepository } from '../repositories/bookingRepository';
import { tripRepository, type TripFilters } from '../repositories/tripRepository';
import { routeService } from '../services/routeService';
import { paymentService } from '../services/paymentService';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const bookingKeys = {
    routes:       ['routes'] as const,
    routeBundle:  (id: string) => ['routes', id, 'bundle'] as const,
    trips:        (f: TripFilters) => ['trips', f] as const,
    trip:         (id: string) => ['trip', id] as const,
    seats:        (id: string) => ['trip', id, 'seats'] as const,
    bookings:     (s: BookingStatusDTO) => ['bookings', s] as const,
    booking:      (id: string) => ['booking', id] as const,
    cancelInfo:   (id: string) => ['booking', id, 'cancelInfo'] as const,
    location:     (id: string) => ['trip', id, 'location'] as const,
};

// ─── Routes ───────────────────────────────────────────────────────────────────

export function useRoutes() {
    return useInfiniteQuery({
        queryKey: bookingKeys.routes,
        queryFn:  ({ pageParam = 1, signal }) => routeService.listRoutes(pageParam as number, 20, signal),
        initialPageParam: 1,
        getNextPageParam: (last) =>
            last.meta?.totalPages && last.meta.page && last.meta.page < last.meta.totalPages
                ? last.meta.page + 1
                : undefined,
    });
}

export function useRouteBundle(routeId?: string) {
    return useQuery({
        queryKey: bookingKeys.routeBundle(routeId ?? ''),
        queryFn:  ({ signal }) => routeService.getRouteBundle(routeId!, signal),
        enabled:  Boolean(routeId),
    });
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export function useTrips(filters: TripFilters) {
    return useInfiniteQuery({
        queryKey: bookingKeys.trips(filters),
        queryFn:  ({ pageParam = 1, signal }) =>
            tripRepository.list({ ...filters, page: pageParam as number, pageSize: 20 }, signal),
        initialPageParam: 1,
        getNextPageParam: (last) =>
            last.meta?.totalPages && last.meta.page && last.meta.page < last.meta.totalPages
                ? last.meta.page + 1
                : undefined,
    });
}

export function useTrip(tripId?: string) {
    return useQuery({
        queryKey: bookingKeys.trip(tripId ?? ''),
        queryFn:  ({ signal }) => tripRepository.detail(tripId!, signal),
        enabled:  Boolean(tripId),
    });
}

export function useSeats(tripId?: string) {
    return useQuery({
        queryKey:       bookingKeys.seats(tripId ?? ''),
        queryFn:        ({ signal }) => tripRepository.seats(tripId!, signal),
        enabled:        Boolean(tripId),
        refetchInterval: 30_000,
    });
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export function useBookings(status: BookingStatusDTO) {
    return useInfiniteQuery({
        queryKey: bookingKeys.bookings(status),
        queryFn:  ({ pageParam = 1, signal }) =>
            bookingRepository.list(status, pageParam as number, 20, signal),
        initialPageParam: 1,
        getNextPageParam: (last) =>
            last.meta?.totalPages && last.meta.page && last.meta.page < last.meta.totalPages
                ? last.meta.page + 1
                : undefined,
    });
}

export function useBookingDetail(bookingId?: string) {
    return useQuery({
        queryKey: bookingKeys.booking(bookingId ?? ''),
        queryFn:  ({ signal }) => bookingRepository.detail(bookingId!, signal),
        enabled:  Boolean(bookingId),
    });
}

export function useCreateBooking() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateBookingDTO) => bookingRepository.create(body),
        onSuccess:  () => void qc.invalidateQueries({ queryKey: ['bookings'] }),
    });
}

export function useCancellationInfo(bookingId?: string) {
    return useQuery({
        queryKey: bookingKeys.cancelInfo(bookingId ?? ''),
        queryFn:  ({ signal }) => bookingRepository.cancellationInfo(bookingId!, signal),
        enabled:  Boolean(bookingId),
        staleTime: 30 * 1000,
    });
}

export function useCancelBooking() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (bookingId: string) => bookingRepository.cancel(bookingId),
        onSuccess:  () => void qc.invalidateQueries({ queryKey: ['bookings'] }),
    });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

interface InitiatePayload {
    body:           InitiatePaymentDTO;
    idempotencyKey: string;
}

export function useInitiatePayment() {
    return useMutation({
        mutationFn: ({ body, idempotencyKey }: InitiatePayload) =>
            paymentService.initiate(body, idempotencyKey),
    });
}

export function useVerifyPayment() {
    return useMutation({
        mutationFn: (transactionId: string) => paymentService.verify(transactionId),
    });
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export function useSubmitReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateReviewDTO) => bookingRepository.review(body),
        onSuccess:  () => void qc.invalidateQueries({ queryKey: ['bookings'] }),
    });
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export function useTripLocation(tripId?: string) {
    return useQuery({
        queryKey:        bookingKeys.location(tripId ?? ''),
        queryFn:         ({ signal }) => tripRepository.latestLocation(tripId!, signal),
        enabled:         Boolean(tripId),
        refetchInterval: 5_000,
    });
}
