// src/api/client.ts
// Axios instance with:
//   • Bearer token injection
//   • 401 → token refresh → retry
//   • 403 Auth.AgreementUpdateRequired → redirect to re-accept screen
//
// IMPORTANT: This file must NOT import MMKV at the top level.
// All MMKV access goes through the lazy helpers in features/auth/utils/token.ts

import axios, {
    AxiosError,
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';
import { router } from 'expo-router';
import { ENDPOINTS } from './endpoints';
import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    storeTokens,
} from '../features/auth/utils/token';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.adrash.et';

// ── Lazy auth store access (avoids circular deps + MMKV init order issues) ───
function getAuthStore() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../features/auth/store/authStore').useAuthStore;
}

// ── Token refresh queue ───────────────────────────────────────────────────────
// Prevents multiple simultaneous 401s from triggering multiple refresh calls.
type QueueEntry = {
    resolve: (token: string) => void;
    reject:  (err: unknown)  => void;
};
let refreshing = false;
let queue: QueueEntry[] = [];

function flushQueue(err: unknown, token: string | null) {
    queue.forEach(({ resolve, reject }) =>
        err ? reject(err) : resolve(token!),
    );
    queue = [];
}

// ── Axios instance ────────────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
    baseURL: `${API_BASE}/api/v1`,
    timeout: 30_000,
    headers: {
        'Content-Type': 'application/json',
        Accept:         'application/json',
    },
});

// ── Request interceptor: attach access token ──────────────────────────────────
apiClient.interceptors.request.use(
    async (cfg: InternalAxiosRequestConfig) => {
        const token = await getAccessToken();
        if (token) cfg.headers.Authorization = `Bearer ${token}`;
        return cfg;
    },
    (err) => Promise.reject(err),
);

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
    (res: AxiosResponse) => res,

    async (err: AxiosError) => {
        const original = err.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        // ── 403: Agreement update required ────────────────────────────────────
        // The server returns this when the passenger hasn't accepted the latest
        // T&C version.  We redirect to the agreement screen (re-accept mode)
        // and cancel the original request so the UI doesn't show a generic error.
        const errorCode = (err.response?.data as Record<string, unknown>)?.code;
        if (
            err.response?.status === 403 &&
            errorCode === 'Auth.AgreementUpdateRequired'
        ) {
            router.replace({
                pathname: '/(auth)/agreement',
                params:   { reaccept: '1' },
            });
            // Return a never-resolving promise so the calling hook stays in
            // its loading state until the user has re-accepted and navigated back.
            return new Promise(() => {});
        }

        // ── 401: Try token refresh ────────────────────────────────────────────
        if (
            !original ||
            original.url === ENDPOINTS.AUTH.REFRESH ||
            err.response?.status !== 401 ||
            original._retry
        ) {
            return Promise.reject(err);
        }

        // Queue subsequent 401s while a refresh is in flight
        if (refreshing) {
            return new Promise<string>((resolve, reject) => {
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

            const { data } = await axios.post<{
                access_token: string;
                expires_in: number;
                refresh_token?: string;
            }>(
                `${API_BASE}/api/v1${ENDPOINTS.AUTH.REFRESH}`,
                { refresh_token: rt },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept:         'application/json',
                    },
                },
            );

            await storeTokens({
                accessToken:  data.access_token,
                refreshToken: data.refresh_token ?? undefined,
                expiresIn:    data.expires_in,
            });

            flushQueue(null, data.access_token);
            original.headers.Authorization = `Bearer ${data.access_token}`;
            return apiClient(original);

        } catch (refreshErr) {
            flushQueue(refreshErr, null);
            await clearTokens();
            getAuthStore().getState().logout();
            router.replace('/(auth)/phone');
            return Promise.reject(refreshErr);

        } finally {
            refreshing = false;
        }
    },
);