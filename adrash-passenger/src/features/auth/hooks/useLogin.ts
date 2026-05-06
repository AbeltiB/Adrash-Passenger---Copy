import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { storeTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import type { LoginRequest, LoginResponse, User } from '../../../types';

/** Logs in with username/password, persists JWT tokens, and loads the current user. */
export function useLogin() {
    const { setAuthenticated, setUser } = useAuthStore();

    return useMutation<User, unknown, LoginRequest>({
        mutationFn: async (credentials) => {
            const login = await apiClient.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, credentials);
            await storeTokens({
                accessToken: login.data.access_token,
                refreshToken: login.data.refresh_token,
                expiresIn: login.data.expires_in,
            });

            const me = await apiClient.get<User>(ENDPOINTS.AUTH.ME);
            return me.data;
        },
        onSuccess: (user) => {
            setUser(user);
            setAuthenticated(true);
        },
    });
}
