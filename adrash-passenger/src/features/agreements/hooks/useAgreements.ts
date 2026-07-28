// src/features/agreements/hooks/useAgreements.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { toApiLanguage } from '../../../lib/languages';
import {
    type AcceptAgreementRequest,
    type AcceptAgreementResponse,
    type AgreementLang,
    type AgreementType,
    type CurrentAgreementDto,
} from './types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const agreementKeys = {
    current: (lang: AgreementLang) =>
        ['agreements', 'current', 'Passenger', lang] as const,
};

type AgreementApiRecord = Record<string, unknown>;

function unwrapData(value: unknown): AgreementApiRecord {
    if (!value || typeof value !== 'object') return {};

    const record = value as AgreementApiRecord;
    const wrapped = record.data;

    if (wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped)) {
        return wrapped as AgreementApiRecord;
    }

    return record;
}

function readString(record: AgreementApiRecord, keys: string[]): string | null {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) return value;
        if (typeof value === 'number') return String(value);
    }

    return null;
}

function readLocalizedContent(
    record: AgreementApiRecord,
    apiLang: AgreementLang,
): string | null {
    const direct = readString(record, [
        'content',
        'body',
        'text',
        'html',
        'markdown',
        'documentContent',
        'agreementText',
    ]);
    if (direct) return direct;

    const content = record.content ?? record.body ?? record.translations;
    if (!content || typeof content !== 'object' || Array.isArray(content)) return null;

    const localized = content as AgreementApiRecord;
    return readString(localized, [
        apiLang,
        apiLang.toLowerCase(),
        apiLang.toUpperCase(),
        apiLang === 'En' ? 'english' : '',
        apiLang === 'Am' ? 'amharic' : '',
        apiLang === 'Om' ? 'oromiffa' : '',
    ].filter(Boolean));
}

function normalizeAgreement(value: unknown, apiLang: AgreementLang): CurrentAgreementDto {
    const record = unwrapData(value);
    const version = readString(record, [
        'version',
        'documentVersion',
        'agreementVersion',
    ]);
    const content = readLocalizedContent(record, apiLang);

    if (!version || !content) {
        throw new Error('Agreement response is missing a version or content.');
    }

    const type = readString(record, ['type', 'agreementType']) as AgreementType | null;

    return {
        id: readString(record, ['id', 'agreementId', 'documentId']) ?? version,
        title: readString(record, ['title', 'name']) ?? 'Passenger Agreement',
        content,
        version,
        type: type ?? 'Passenger',
        language: (readString(record, ['language', 'lang']) as AgreementLang | null) ?? apiLang,
        effectiveDate: readString(record, [
            'effectiveDate',
            'effectiveAt',
            'effectiveFrom',
            'createdAt',
        ]) ?? new Date().toISOString(),
        isSigned: record.isSigned === true || record.accepted === true,
        signedAt: readString(record, ['signedAt', 'acceptedAt']),
    };
}

function normalizeAcceptResponse(value: unknown): AcceptAgreementResponse {
    const record = unwrapData(value);

    return {
        acceptedAt: readString(record, ['acceptedAt', 'signedAt']) ?? new Date().toISOString(),
        version: readString(record, ['version', 'documentVersion', 'agreementVersion']) ?? '',
    };
}

// ─── useCurrentAgreement ─────────────────────────────────────────────────────
/**
 * Fetches GET /auth/agreements/current?type=Passenger&lang={lang}
 *
 * Automatically uses the active i18n language so the agreement text is shown
 * in whatever language the user selected on the splash screen.
 */
export function useCurrentAgreement() {
    const { i18n } = useTranslation();

    // Map 'en' | 'am' | 'om' | 'so' | 'ti' | 'ar'  →  'En' | 'Am' | 'Om' | 'So' | 'Ti' | 'Ar'
    const apiLang = toApiLanguage(i18n.resolvedLanguage ?? i18n.language);

    return useQuery<CurrentAgreementDto>({
        queryKey: agreementKeys.current(apiLang),
        queryFn: async () => {
            try {
                const res = await apiClient.get<unknown>(
                    ENDPOINTS.AGREEMENTS.CURRENT,
                    { params: { type: 'Passenger', lang: apiLang } },
                );
                return normalizeAgreement(res.data, apiLang);
            } catch (err) {
                // The legal document may not be translated into this UI
                // language yet even though the app UI itself is — the app's
                // translated-string coverage and the backend's translated
                // legal-document coverage are two separate efforts that can
                // be at different points at any given time. Don't let an
                // unrecognised lang code strand onboarding entirely; retry
                // once in English rather than leaving the user stuck on an
                // error screen with no way to accept and continue.
                if (apiLang === 'En') throw err;
                const res = await apiClient.get<unknown>(
                    ENDPOINTS.AGREEMENTS.CURRENT,
                    { params: { type: 'Passenger', lang: 'En' } },
                );
                return normalizeAgreement(res.data, 'En');
            }
        },
        // Cache for 10 minutes — agreements don't change mid-session.
        // Deliberately NOT using placeholderData to carry over the previous
        // language's cached content: doing so showed the OLD language's
        // legal text immediately (with no loading indicator, since `data`
        // was already defined) whenever the user switched languages and
        // came back to this screen, only silently swapping to the correct
        // text once the new fetch resolved. A brief, honest loading spinner
        // beats momentarily presenting the wrong language's terms as current.
        staleTime: 10 * 60 * 1_000,
    });
}

// ─── useAcceptAgreement ───────────────────────────────────────────────────────
/**
 * Sends POST /auth/agreements/accept
 * Called when the user taps "I agree and continue" after scrolling to the bottom.
 */
export function useAcceptAgreement() {
    const queryClient = useQueryClient();
    // Capture the i18n instance at hook call time (stable ref, safe in closure)
    const { i18n } = useTranslation();

    return useMutation<
        AcceptAgreementResponse,
        Error,
        AcceptAgreementRequest
    >({
        mutationFn: async (body) => {
            const res = await apiClient.post<unknown>(
                ENDPOINTS.AGREEMENTS.ACCEPT,
                body,
            );
            return normalizeAcceptResponse(res.data);
        },
        onSuccess: () => {
            // Optimistically mark the cached agreement as signed so the UI
            // doesn't re-fetch before navigation completes.
            const apiLang = toApiLanguage(i18n.resolvedLanguage ?? i18n.language);

            queryClient.setQueryData<CurrentAgreementDto>(
                agreementKeys.current(apiLang),
                (prev) =>
                    prev
                        ? {
                              ...prev,
                              isSigned: true,
                              signedAt: new Date().toISOString(),
                          }
                        : prev,
            );
        },
    });
}