import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { clearTokens, getRefreshToken } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import { queryClient } from '../../../lib/queryClient';

/** Handles graceful logout: notifies backend, clears tokens & cache. */
export function useLogout() {
    const { logout } = useAuthStore();

    return useMutation<void, unknown, void>({
        mutationFn: async () => {
            // Backend LogoutCommand expects the refresh token (camelCase) to
            // revoke that session server-side.
            const refreshToken = await getRefreshToken();
            await apiClient.post(ENDPOINTS.AUTH.LOGOUT, refreshToken ? { refreshToken } : {});
        },
        onSettled: async () => {
            await clearTokens();
            logout();
            queryClient.clear();
        },
    });
}
