import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { storeTokens } from '../utils/token';
import { useAuthStore } from '../store/authStore';
import type { OtpVerifyRequest, OtpVerifyResponse, ApiResponse } from '../../../types';

/** Verifies OTP, stores tokens, and updates auth state */
export function useOtpVerify() {
  const { setUser, setAuthenticated } = useAuthStore();

  return useMutation<ApiResponse<OtpVerifyResponse>, unknown, OtpVerifyRequest>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<OtpVerifyResponse>>(
        ENDPOINTS.AUTH.VERIFY_OTP,
        data
      );
      return res.data;
    },
    onSuccess: async (apiRes) => {
      if (apiRes.success && apiRes.data) {
        const { tokens, user, isNewUser } = apiRes.data;
        
        // Persist tokens securely
        await storeTokens(tokens);
        
        // Update Zustand store
        setUser(user);
        setAuthenticated(true);
        
        // 💡 Note: Navigation to ProfileSetup (if isNewUser) or Home
        // should be handled by the calling screen based on this flag.
      }
    },
  });
}