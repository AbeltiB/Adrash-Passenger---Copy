import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { API_V1_BASE } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { getRefreshToken, storeTokens, clearTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import type { AuthTokens, RefreshTokenResponse } from '../../../types';


/** Manual token refresh hook. The apiClient interceptor handles automatic 401 refreshes. */
export function useRefreshToken() {
    const { logout } = useAuthStore();

    return useMutation<AuthTokens, unknown, void>({
        mutationFn: async () => {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token available');

            const { data } = await axios.post<RefreshTokenResponse>(
                `${API_V1_BASE}${ENDPOINTS.AUTH.REFRESH}`,
                { refresh_token: refreshToken },
                { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
            );

            return { accessToken: data.access_token, expiresIn: data.expires_in };
        },
        onSuccess: async (tokens) => {
            await storeTokens(tokens);
        },
        onError: async () => {
            await clearTokens();
            logout();
        },
    });
}
