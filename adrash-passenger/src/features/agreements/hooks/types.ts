// src/features/agreements/types.ts
// These mirror exactly what the Stage 1 API returns.

import type { ApiLanguage } from '../../../api/types';

export type AgreementType = 'Passenger' | 'Driver' | 'General';

// Aliased (not just re-exported) so existing call sites in this feature don't
// need to know the type moved — the canonical language list/mapping now
// lives in src/lib/languages.ts (previously this file had its own
// independent copy of the same { en:'En', am:'Am', om:'Om' } mapping, which
// risked drifting out of sync with the identical copies in the splash
// screen and the profile screen's language switcher).
export type AgreementLang = ApiLanguage;

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