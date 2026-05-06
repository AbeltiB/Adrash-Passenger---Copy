// src/features/profile/hooks/useDeleteAccount.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { clearTokens } from '../../auth/utils/token';
import { useAuthStore } from '../../auth/store/authStore';

export function useDeleteAccount() {
    const queryClient = useQueryClient();
    const logout = useAuthStore((s) => s.logout);

    return useMutation<void, Error, void>({
        mutationFn: async () => {
            await apiClient.delete(ENDPOINTS.USERS.ME);
        },
        onSuccess: async () => {
            await clearTokens();
            logout();
            queryClient.clear();
            router.replace('/(auth)');
        },
    });
}