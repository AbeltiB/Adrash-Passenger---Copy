import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { clearTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import { queryClient } from '../../../lib/queryClient';

/** Handles graceful logout: notifies backend, clears tokens & cache */
export function useLogout() {
    const { logout } = useAuthStore();

    return useMutation<void, unknown, void>({
        mutationFn: async () => {
            // Optional: inform backend to invalidate session
            try {
                await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
            } catch {
                // Silently fail if backend is unreachable; local cleanup still proceeds
            }
        },
        onSettled: async () => {
            // Clear secure storage
            await clearTokens();

            // Reset auth state
            logout();

            // Clear all cached queries
            queryClient.clear();
        },
    });
}