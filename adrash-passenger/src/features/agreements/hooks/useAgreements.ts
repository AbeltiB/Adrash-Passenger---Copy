// src/features/agreements/hooks/useAgreements.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { i18n } from 'i18next';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import {
    LANG_MAP,
    type AcceptAgreementRequest,
    type AcceptAgreementResponse,
    type AgreementLang,
    type CurrentAgreementDto,
} from './types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const agreementKeys = {
    current: (lang: AgreementLang) =>
        ['agreements', 'current', 'Passenger', lang] as const,
};

// ─── useCurrentAgreement ─────────────────────────────────────────────────────
/**
 * Fetches GET /auth/agreements/current?type=Passenger&lang={lang}
 *
 * Automatically uses the active i18n language so the agreement text is shown
 * in whatever language the user selected on the splash screen.
 *
 * Falls back to the MMKV-cached version when offline.
 */
export function useCurrentAgreement() {
    const { i18n } = useTranslation();

    // Map 'en' | 'am' | 'om'  →  'En' | 'Am' | 'Om'
    const apiLang: AgreementLang = LANG_MAP[i18n.language] ?? 'En';

    return useQuery<CurrentAgreementDto>({
        queryKey: agreementKeys.current(apiLang),
        queryFn: async () => {
            const res = await apiClient.get<CurrentAgreementDto>(
                ENDPOINTS.AGREEMENTS.CURRENT,
                {
                    params: {
                        type: 'Passenger',
                        lang: apiLang,
                    },
                },
            );
            return res.data;
        },
        // Cache for 10 minutes — agreements don't change mid-session
        staleTime: 10 * 60 * 1_000,
        // Keep old data visible while refetching (no flash of loading state)
        placeholderData: (prev) => prev,
    });
}

// ─── useAcceptAgreement ───────────────────────────────────────────────────────
/**
 * Sends POST /auth/agreements/accept
 * Called when the user taps "I agree and continue" after scrolling to the bottom.
 *
 * On success the caller should:
 *   1. authStore.acceptAgreement(version)   — persist acceptance locally
 *   2. router.replace('/(auth)/phone')      — continue the flow
 */
export function useAcceptAgreement() {
    const queryClient = useQueryClient();

    return useMutation<
        AcceptAgreementResponse,
        Error,
        AcceptAgreementRequest
    >({
        mutationFn: async (body) => {
            const res = await apiClient.post<AcceptAgreementResponse>(
                ENDPOINTS.AGREEMENTS.ACCEPT,
                body,
            );
            return res.data;
        },
        onSuccess: (_data, variables) => {
            // Optimistically mark the cached agreement as signed so the UI
            // doesn't re-fetch before navigation completes.
            const { i18n } = require('i18next') as typeof import('i18next');
            const apiLang: AgreementLang = LANG_MAP[i18n.language] ?? 'En';

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