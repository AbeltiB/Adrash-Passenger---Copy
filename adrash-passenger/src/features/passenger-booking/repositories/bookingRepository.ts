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
import { getData, getPage, postData } from '../services/apiEnvelope';

export class BookingRepository {
    create(body: CreateBookingDTO, signal?: AbortSignal) {
        return postData<BookingDTO, CreateBookingDTO>('/bookings', body, signal);
    }

    list(status: BookingStatusDTO, page = 1, pageSize = 20, signal?: AbortSignal) {
        return getPage<BookingDTO>('/bookings', { page, pageSize, status }, signal);
    }

    detail(id: string, signal?: AbortSignal) {
        return getData<BookingDTO>(`/bookings/${id}`, undefined, signal);
    }

    cancel(id: string, signal?: AbortSignal) {
        return postData<BookingDTO, Record<string, never>>(`/bookings/${id}/cancel`, {}, signal);
    }

    cancellationInfo(id: string, signal?: AbortSignal) {
        return getData<CancellationInfoDto>(`/bookings/${id}/cancellation-info`, undefined, signal);
    }

    initiatePayment(body: InitiatePaymentDTO, signal?: AbortSignal) {
        return postData<PaymentTransactionDTO, InitiatePaymentDTO>('/payments/initiate', body, signal);
    }

    verifyPayment(body: VerifyPaymentDTO, signal?: AbortSignal) {
        return postData<PaymentTransactionDTO, VerifyPaymentDTO>('/payments/verify', body, signal);
    }

    review(body: CreateReviewDTO, signal?: AbortSignal) {
        return postData<ReviewDTO, CreateReviewDTO>('/reviews', body, signal);
    }
}

export const bookingRepository = new BookingRepository();
