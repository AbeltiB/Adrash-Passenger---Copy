import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { clearAllSecureData } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import { useBookingFlowStore } from '../../passenger-booking/store/bookingFlowStore';
import { queryClient } from '../../../lib/queryClient';
import { removeKey } from '../../../lib/storage';
import { MMKVKeys } from '../../../constants/mmkvKeys';

/**
 * Handles graceful logout: notifies backend, then clears everything local —
 * tokens, device token/phone, cached passenger/booking PII, and react-query
 * cache. This is a shared device's only real reset point: if a different
 * person signs in next, nothing from this session should still be readable
 * or pre-filled for them.
 */
export function useLogout() {
    const { logout } = useAuthStore();

    return useMutation<void, unknown, void>({
        mutationFn: async () => {
            await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
        },
        onSettled: async () => {
            await clearAllSecureData();
            logout();
            useBookingFlowStore.getState().resetFlow();
            removeKey(MMKVKeys.PIN_HAS_BEEN_SET);
            queryClient.clear();
        },
    });
}
