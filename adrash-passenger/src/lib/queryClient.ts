import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 1_000,   // 2 min
            gcTime: 10 * 60 * 1_000,   // 10 min
            refetchOnWindowFocus: false,
            retry: (count, error) => {
                if (error instanceof AxiosError) {
                    const status = error.response?.status ?? 0;
                    if (status >= 400 && status < 500) return false;
                }
                return count < 2;
            },
        },
        mutations: { retry: false },
    },
});