import type { InitiatePaymentDTO, PaymentMethodDTO } from '../dtos/bookingDtos';
import { bookingRepository } from '../repositories/bookingRepository';
export const PAYMENT_METHODS: PaymentMethodDTO[] = ['ADC', 'Telebirr', 'CBE Birr', 'HelloCash'];
export function maskAccountRef(value: string) { if (value.length <= 6) return '••••'; return `${value.slice(0, 4)}••••${value.slice(-3)}`; }
export class PaymentService { initiate(body: InitiatePaymentDTO, signal?: AbortSignal) { return bookingRepository.initiatePayment({ ...body, accountRef: body.accountRef.trim() }, signal); } verify(transactionId: string, signal?: AbortSignal) { return bookingRepository.verifyPayment({ transactionId }, signal); } }
export const paymentService = new PaymentService();
