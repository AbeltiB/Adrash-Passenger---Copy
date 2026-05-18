// src/features/auth/hooks/useOtpVerify.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { storeDevicePhone, storeDeviceToken, storeTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse, AuthTokens, LoginResponse } from '../../../types';

// ─── Request / Response shapes ────────────────────────────────────────────────

interface OtpVerifyPayload {
  phone: string;
  code: string;
  existingDeviceToken?: string | null;
  deviceLabel?: string;
  deviceFingerprint?: string;
}

interface OtpVerifyResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  deviceToken?: string;
  isNewUser: boolean;
  needsSetup: boolean;
  agreementRequired: boolean;
}

type MaybeWrapped = OtpVerifyResult | ApiResponse<OtpVerifyResult>;

function isWrapped(v: MaybeWrapped): v is ApiResponse<OtpVerifyResult> {
  return typeof v === 'object' && v !== null && 'success' in v && 'data' in v;
}

function unwrap(v: MaybeWrapped): OtpVerifyResult {
  return isWrapped(v) ? v.data : v;
}

function normalizeTokens(tokens: { accessToken: string; refreshToken: string } | LoginResponse): AuthTokens {
  if ('access_token' in tokens) {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    };
  }
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: 3600 };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOtpVerify() {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  return useMutation<OtpVerifyResult, unknown, OtpVerifyPayload>({
    mutationFn: async (data) => {
      const res = await apiClient.post<MaybeWrapped>(ENDPOINTS.AUTH.VERIFY_OTP, data);
      return unwrap(res.data);
    },
    onSuccess: async (result, payload) => {
      await storeTokens(normalizeTokens(result.tokens));
      if (result.deviceToken) await storeDeviceToken(result.deviceToken);
      await storeDevicePhone(payload.phone);
      setAuthenticated(true);
    },
  });
}