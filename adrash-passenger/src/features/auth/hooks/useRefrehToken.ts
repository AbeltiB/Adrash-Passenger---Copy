import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { getRefreshToken, storeTokens, clearTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse, AuthTokens } from '../../../types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.adrash.app';

/** 
 * Manual token refresh hook.
 * ⚠️ Note: Your apiClient.ts interceptor already handles automatic 401 → refresh flow.
 * Use this hook only for explicit background sync or manual retry scenarios.
 */
export function useRefreshToken() {
    const { logout } = useAuthStore();

    return useMutation<AuthTokens | null, unknown, void>({
        mutationFn: async () => {
            const rt = await getRefreshToken();
            if (!rt) throw new Error('No refresh token available');

            // Use raw axios to avoid infinite interceptor loops
            const { data } = await axios.post<ApiResponse<AuthTokens>>(
                `${API_BASE}/api/v1/auth/refresh`,
                { refreshToken: rt }
            );
            return data.data;
        },
        onSuccess: async (tokens) => {
            if (tokens) await storeTokens(tokens);
        },
        onError: async () => {
            await clearTokens();
            logout();
        },
    });
}