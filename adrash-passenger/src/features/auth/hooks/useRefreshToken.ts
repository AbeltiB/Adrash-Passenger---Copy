import { useMutation } from '@tanstack/react-query';
import { refreshAccessToken } from '../../../api/client';
import { clearTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import type { AuthTokens } from '../../../types';


/** Manual token refresh hook. The apiClient interceptor handles automatic 401 refreshes. */
export function useRefreshToken() {
    const { logout } = useAuthStore();

    return useMutation<AuthTokens, unknown, void>({
        mutationFn: refreshAccessToken,
        onError: async () => {
            await clearTokens();
            logout();
        },
    });
}
