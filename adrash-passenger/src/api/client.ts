import axios, {
    AxiosError,
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosResponse,
} from 'axios';
import {
    getAccessToken,
    getRefreshToken,
    storeTokens,
    clearTokens,
} from '../features/auth/utils/token';
import type { ApiResponse, AuthTokens } from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.adrash.app';

// ── Lazy import avoids circular dep at module-init time ───────────────────────
function getAuthStore() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../features/auth/store/authStore').useAuthStore;
}

// ── Queue for requests during token refresh ───────────────────────────────────
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshing = false;
let queue: QueueEntry[] = [];

function flushQueue(err: unknown, token: string | null) {
    queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)));
    queue = [];
}

// ── Axios instance ─────────────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
    baseURL: `${API_BASE}/api/v1`,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ── Request: attach access token ──────────────────────────────────────────────
apiClient.interceptors.request.use(
    async (cfg: InternalAxiosRequestConfig) => {
        const token = await getAccessToken();
        if (token) cfg.headers.Authorization = `Bearer ${token}`;
        return cfg;
    },
    (err) => Promise.reject(err),
);

// ── Response: 401 → refresh ───────────────────────────────────────────────────
apiClient.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
        const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (err.response?.status !== 401 || original._retry) {
            return Promise.reject(err);
        }

        if (refreshing) {
            return new Promise((resolve, reject) => {
                queue.push({ resolve, reject });
            }).then((token) => {
                original.headers.Authorization = `Bearer ${token}`;
                return apiClient(original);
            });
        }

        original._retry = true;
        refreshing = true;

        try {
            const rt = await getRefreshToken();
            if (!rt) throw new Error('no-refresh-token');

            const { data } = await axios.post<ApiResponse<AuthTokens>>(
                `${API_BASE}/api/v1/auth/refresh`,
                { refreshToken: rt },
            );
            const { accessToken, refreshToken: newRt, expiresIn } = data.data;
            await storeTokens({ accessToken, refreshToken: newRt, expiresIn });
            flushQueue(null, accessToken);

            original.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(original);
        } catch (refreshErr) {
            flushQueue(refreshErr, null);
            await clearTokens();
            getAuthStore().getState().logout();
            return Promise.reject(refreshErr);
        } finally {
            refreshing = false;
        }
    },
);