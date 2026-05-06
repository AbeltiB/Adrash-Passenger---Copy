import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { useAuthStore } from '../store/authStore';
import type { User } from '../../../types';

export const authQueryKeys = {
    me: ['auth', 'me'] as const,
};

/** Loads the authenticated user from GET /auth/me. */
export function useCurrentUser(enabled = true) {
    const { setAuthenticated, setUser } = useAuthStore();

    return useQuery({
        queryKey: authQueryKeys.me,
        enabled,
        queryFn: async () => {
            const res = await apiClient.get<User>(ENDPOINTS.AUTH.ME);
            setUser(res.data);
            setAuthenticated(true);
            return res.data;
        },
    });
}
