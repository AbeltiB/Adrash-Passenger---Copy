import type {
    BookingDTO,
    BookingStatusDTO,
    CreateBookingDTO,
    CreateReviewDTO,
    InitiatePaymentDTO,
    PaymentTransactionDTO,
    ReviewDTO,
    VerifyPaymentDTO,
} from '../dtos/bookingDtos';
import type { CancellationInfoDto } from '../../../api/types';
import { getData, getPage, postData, deleteData } from '../services/apiEnvelope';
import { mapBooking } from '../services/mappers';

export class BookingRepository {
    // create/list/detail run raw API JSON through mapBooking so the app's field
    // names (bookingReference, totalFare, qrCode) are populated from the backend's
    // (bookingRef, totalFareEtb, qrCodeData).
    //
    // idempotencyKey mirrors the same header already sent on /payments/initiate.
    // It is optional here because the backend's booking-create endpoint isn't
    // documented as honoring it yet (see Adrash.postman_collection.json) — this
    // is a forward-compatible, no-op-if-ignored addition, not a guarantee.
    create(body: CreateBookingDTO, idempotencyKey?: string, signal?: AbortSignal) {
        return postData<unknown, CreateBookingDTO>(
            '/bookings', body, signal,
            idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        ).then(mapBooking);
    }

    list(status: BookingStatusDTO, page = 1, pageSize = 20, signal?: AbortSignal) {
        return getPage<unknown>('/bookings', { page, pageSize, status }, signal)
            .then((p) => ({ ...p, items: p.items.map(mapBooking) }));
    }

    detail(id: string, signal?: AbortSignal) {
        return getData<unknown>(`/bookings/${id}`, undefined, signal).then(mapBooking);
    }

    cancel(id: string, signal?: AbortSignal) {
        return deleteData<BookingDTO>(`/bookings/${id}`, signal);
    }

    cancellationInfo(id: string, signal?: AbortSignal) {
        return getData<CancellationInfoDto>(`/bookings/${id}/cancellation-info`, undefined, signal);
    }

    initiatePayment(body: InitiatePaymentDTO, idempotencyKey: string, signal?: AbortSignal) {
        return postData<PaymentTransactionDTO, InitiatePaymentDTO>(
            '/payments/initiate', body, signal,
            { 'Idempotency-Key': idempotencyKey },
        );
    }

    verifyPayment(body: VerifyPaymentDTO, signal?: AbortSignal) {
        return postData<PaymentTransactionDTO, VerifyPaymentDTO>('/payments/verify', body, signal);
    }

    review(body: CreateReviewDTO, signal?: AbortSignal) {
        return postData<ReviewDTO, CreateReviewDTO>('/reviews', body, signal);
    }
}

export const bookingRepository = new BookingRepository();
