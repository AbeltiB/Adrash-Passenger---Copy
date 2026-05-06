// src/features/profile/hooks/useReferral.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type { ApiResponse, ReferralCodeDto } from '../../../api/types';

export const REFERRAL_KEY = ['rewards', 'referral'] as const;

export function useReferral() {
    return useQuery<ReferralCodeDto>({
        queryKey: REFERRAL_KEY,
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<ReferralCodeDto>>(
                ENDPOINTS.REWARDS.REFERRAL,
            );
            if (!res.data.success || !res.data.data) {
                throw new Error(res.data.errors?.[0] ?? 'Failed to load referral');
            }
            return res.data.data;
        },
        staleTime: 10 * 60 * 1000,
    });
}