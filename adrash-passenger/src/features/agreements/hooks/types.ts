// src/features/agreements/types.ts
// These mirror exactly what the Stage 1 API returns.

export type AgreementType   = 'Passenger' | 'Driver' | 'General';

// API language codes — capital first letter, matches Accept-Language header
// values the backend understands.
export type AgreementLang = 'En' | 'Am' | 'Om';

/** Maps our i18n language codes to the API's expected lang param */
export const LANG_MAP: Record<string, AgreementLang> = {
    en: 'En',
    am: 'Am',
    om: 'Om',
};

/**
 * Shape returned by GET /auth/agreements/current?type=Passenger&lang=Am
 * Adjust field names to match your actual API response.
 */
export interface CurrentAgreementDto {
    id: string;
    title: string;
    content: string;           // full HTML or plain text body
    version: string;           // e.g. "2.1"
    type: AgreementType;
    language: AgreementLang;
    effectiveDate: string;     // ISO date
    isSigned: boolean;         // true if the current user already accepted this version
    signedAt: string | null;
}

/**
 * Body sent to POST /auth/agreements/accept
 */
export interface AcceptAgreementRequest {
    agreementType: AgreementType;
    documentVersion: string;
}

export interface AcceptAgreementResponse {
    acceptedAt: string;
    version: string;
}