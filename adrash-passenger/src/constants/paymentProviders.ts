import type { PaymentProvider } from '../types';

export interface PaymentProviderConfig {
    id: PaymentProvider;
    /** i18n key */
    labelKey: string;
    /** Hex brand colour */
    color: string;
    /** Short abbrev shown when logo is unavailable */
    abbr: string;
}

export const PAYMENT_PROVIDERS: PaymentProviderConfig[] = [
    { id: 'telebirr', labelKey: 'booking.payment.telebirr', color: '#6B21A8', abbr: 'TB' },
    { id: 'cbe_birr', labelKey: 'booking.payment.cbe_birr', color: '#1E40AF', abbr: 'CB' },
    { id: 'awash', labelKey: 'booking.payment.awash', color: '#92400E', abbr: 'AW' },
] as const;