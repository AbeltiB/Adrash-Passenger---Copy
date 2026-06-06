import type { InitiatePaymentDTO, SantimPayPartner } from '../dtos/bookingDtos';
import { bookingRepository } from '../repositories/bookingRepository';

// Display metadata for each selectable downstream partner.
export interface PartnerInfo {
    partner:      SantimPayPartner;
    label:        string;
    description:  string;
    emoji:        string;
    badge?:       string;
    instructions: string;
    accountHint:  string;
}

export const SANTIMPAY_PARTNERS: PartnerInfo[] = [
    {
        partner:      'Telebirr',
        label:        'Telebirr',
        description:  'Ethio Telecom mobile money',
        emoji:        '📱',
        badge:        'Most popular',
        instructions: 'Open your Telebirr app or check your phone for a payment prompt, then confirm.',
        accountHint:  'Phone number registered with Telebirr',
    },
    {
        partner:      'Cbe Birr',
        label:        'CBE Birr',
        description:  'Commercial Bank of Ethiopia',
        emoji:        '🏦',
        instructions: 'A USSD prompt will appear on your phone. Dial the code and enter your PIN.',
        accountHint:  'Phone number registered with CBE Birr',
    },
    {
        partner:      'M-Pesa',
        label:        'M-Pesa',
        description:  'Safaricom M-Pesa',
        emoji:        '🌿',
        instructions: "You'll receive a payment request on your phone. Approve it in your M-Pesa menu.",
        accountHint:  'Phone number registered with M-Pesa',
    },
];

export function maskAccountRef(value: string): string {
    if (value.length <= 6) return '••••';
    return `${value.slice(0, 4)}••••${value.slice(-3)}`;
}

export class PaymentService {
    initiate(body: InitiatePaymentDTO, idempotencyKey: string, signal?: AbortSignal) {
        return bookingRepository.initiatePayment(
            { ...body, accountRef: body.accountRef.trim() },
            idempotencyKey,
            signal,
        );
    }

    verify(transactionId: string, signal?: AbortSignal) {
        return bookingRepository.verifyPayment({ transactionId }, signal);
    }
}

export const paymentService = new PaymentService();
