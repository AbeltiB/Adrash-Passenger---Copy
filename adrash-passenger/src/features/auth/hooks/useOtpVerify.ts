import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { storeTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse, AuthTokens, LoginResponse, OtpVerifyRequest, OtpVerifyResponse } from '../../../types';

type MaybeWrappedOtpResponse = OtpVerifyResponse | ApiResponse<OtpVerifyResponse>;

function isWrappedResponse(value: MaybeWrappedOtpResponse): value is ApiResponse<OtpVerifyResponse> {
  return typeof value === 'object' && value !== null && 'data' in value && 'success' in value;
}

function unwrapOtpResponse(value: MaybeWrappedOtpResponse): OtpVerifyResponse {
  return isWrappedResponse(value) ? value.data : value;
}

function normalizeTokens(tokens: AuthTokens | LoginResponse): AuthTokens {
  if ('access_token' in tokens) {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    };
  }

  return tokens;
}

/** Verifies OTP, stores tokens securely, and updates auth state. */
export function useOtpVerify() {
  const { setUser, setAuthenticated } = useAuthStore();

  return useMutation<OtpVerifyResponse, unknown, OtpVerifyRequest>({
    mutationFn: async (data) => {
      const res = await apiClient.post<MaybeWrappedOtpResponse>(ENDPOINTS.AUTH.VERIFY_OTP, data);
      return unwrapOtpResponse(res.data);
    },
    onSuccess: async ({ tokens, user }) => {
      await storeTokens(normalizeTokens(tokens));
      setUser(user);
      setAuthenticated(true);
    },
  });
}
