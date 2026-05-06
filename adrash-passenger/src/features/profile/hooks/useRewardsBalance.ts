// src/features/profile/hooks/useRewardsBalance.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type { ApiResponse, RewardsBalanceDto } from '../../../api/types';

export const REWARDS_BALANCE_KEY = ['rewards', 'balance'] as const;

export function useRewardsBalance() {
    return useQuery<RewardsBalanceDto>({
        queryKey: REWARDS_BALANCE_KEY,
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<RewardsBalanceDto>>(
                ENDPOINTS.REWARDS.BALANCE,
            );
            if (!res.data.success || !res.data.data) {
                throw new Error(res.data.errors?.[0] ?? 'Failed to load rewards balance');
            }
            return res.data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}