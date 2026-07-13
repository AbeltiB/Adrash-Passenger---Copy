// src/features/profile/hooks/useDeleteAccount.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { clearAllSecureData } from '../../auth/utils/token';
import { useAuthStore } from '../../auth/store/authStore';
import { useBookingFlowStore } from '../../passenger-booking/store/bookingFlowStore';
import { removeKey } from '../../../lib/storage';
import { MMKVKeys } from '../../../constants/mmkvKeys';

export function useDeleteAccount() {
    const queryClient = useQueryClient();
    const logout = useAuthStore((s) => s.logout);

    return useMutation<void, Error, void>({
        mutationFn: async () => {
            await apiClient.delete(ENDPOINTS.USERS.ME);
        },
        onSuccess: async () => {
            // Account no longer exists server-side — clear every trace of it
            // locally too: tokens, device token/phone, cached booking PII.
            await clearAllSecureData();
            logout();
            useBookingFlowStore.getState().resetFlow();
            removeKey(MMKVKeys.PIN_HAS_BEEN_SET);
            queryClient.clear();
            router.replace('/(auth)');
        },
    });
}