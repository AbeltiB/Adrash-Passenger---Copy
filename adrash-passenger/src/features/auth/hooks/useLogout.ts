import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { clearTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import { queryClient } from '../../../lib/queryClient';

/** Handles graceful logout: notifies backend, clears tokens & cache. */
export function useLogout() {
    const { logout } = useAuthStore();

    return useMutation<void, unknown, void>({
        mutationFn: async () => {
            await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
        },
        onSettled: async () => {
            await clearTokens();
            logout();
            queryClient.clear();
        },
    });
}
