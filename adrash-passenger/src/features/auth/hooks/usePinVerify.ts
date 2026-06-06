// src/features/auth/hooks/usePinVerify.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type { ApiResponse, AuthTokens } from '../../../types';
import type { UserDto } from '../../../api/types';
import { useAuthStore } from '../store/authStore';
import {
  authTokensFromPair,
  storeDevicePhone,
  storeDeviceToken,
  storeTokens,
} from '../utils/token';

interface PinVerifyPayload {
  phone: string;
  pin: string;
  deviceToken: string;
}

interface PinVerifyResult {
  tokens: AuthTokens;
  user?: UserDto | null;
  deviceToken?: string | null;
  agreementRequired: boolean;
  agreementVersion?: string | null;
}

type RawTokenPair =
  | AuthTokens
  // Backend camelCase TokenPair (absolute expiry timestamps).
  | { accessToken: string; refreshToken?: string; accessTokenExpiresAt?: string }
  // Legacy snake_case OAuth shape.
  | { access_token: string; refresh_token?: string; expires_in: number };

type RawPinVerifyResult = Omit<PinVerifyResult, 'tokens'> & {
  tokens: RawTokenPair;
  // Backend names the version field requiredAgreementVersion, not agreementVersion.
  requiredAgreementVersion?: string | null;
};

type MaybeWrapped = RawPinVerifyResult | ApiResponse<RawPinVerifyResult>;

function isWrapped(value: MaybeWrapped): value is ApiResponse<RawPinVerifyResult> {
  return typeof value === 'object' && value !== null && 'success' in value && 'data' in value;
}

function unwrap(value: MaybeWrapped): RawPinVerifyResult {
  return isWrapped(value) ? value.data : value;
}

function normalizeTokens(tokens: RawTokenPair): AuthTokens {
  if ('access_token' in tokens) {
    return {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
    };
  }
  // camelCase TokenPair (accessTokenExpiresAt) → derive expiresIn.
  return authTokensFromPair(tokens);
}

function userDtoToAuthUser(user: UserDto, phoneFallback: string) {
  const [firstName = '', ...rest] = (user.fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    id: user.id,
    firstName,
    lastName: rest.join(' '),
    phoneNumber: user.phone ?? phoneFallback,
    createdAt: new Date().toISOString(),
  };
}

export function usePinVerify() {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<PinVerifyResult, unknown, PinVerifyPayload>({
    mutationFn: async (payload) => {
      const res = await apiClient.post<MaybeWrapped>(ENDPOINTS.AUTH.VERIFY_PIN, payload);
      const data = unwrap(res.data);
      return {
        ...data,
        tokens: normalizeTokens(data.tokens),
        // Backend sends requiredAgreementVersion; expose it as agreementVersion.
        agreementVersion: data.agreementVersion ?? data.requiredAgreementVersion ?? null,
      };
    },
    onSuccess: async (result, payload) => {
      await storeTokens(result.tokens);
      await storeDevicePhone(payload.phone);
      if (result.deviceToken) await storeDeviceToken(result.deviceToken);
      if (result.user) setUser(userDtoToAuthUser(result.user, payload.phone));
      setAuthenticated(true);
    },
  });
}
