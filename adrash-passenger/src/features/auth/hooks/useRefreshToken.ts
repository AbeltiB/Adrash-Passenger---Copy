import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { API_V1_BASE } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { authTokensFromPair, getRefreshToken, storeTokens, clearTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import type { AuthTokens, TokenPairDto } from '../../../types';


/** Manual token refresh hook. The apiClient interceptor handles automatic 401 refreshes. */
export function useRefreshToken() {
    const { logout } = useAuthStore();

    return useMutation<AuthTokens, unknown, void>({
        mutationFn: async () => {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token available');

            const { data } = await axios.post<TokenPairDto>(
                `${API_V1_BASE}${ENDPOINTS.AUTH.REFRESH}`,
                { refreshToken },
                { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
            );

            return authTokensFromPair(data);
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
