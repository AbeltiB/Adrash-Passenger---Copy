import { useInfiniteQuery } from '@tanstack/react-query';
import { getPage } from '../../passenger-booking/services/apiEnvelope';
import { ENDPOINTS } from '../../../api/endpoints';
import type { RewardsTransactionDto } from '../../../api/types';

export const REWARDS_HISTORY_KEY = ['rewards', 'history'] as const;

export function useRewardsHistory() {
    return useInfiniteQuery({
        queryKey: REWARDS_HISTORY_KEY,
        queryFn:  ({ pageParam = 1, signal }) =>
            getPage<RewardsTransactionDto>(
                ENDPOINTS.REWARDS.HISTORY,
                { page: pageParam as number, pageSize: 20 },
                signal,
            ),
        initialPageParam: 1,
        getNextPageParam: (last) =>
            last.meta?.totalPages && last.meta.page && last.meta.page < last.meta.totalPages
                ? last.meta.page + 1
                : undefined,
        staleTime: 2 * 60 * 1000,
    });
}
