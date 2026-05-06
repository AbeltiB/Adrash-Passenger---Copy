import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type { OtpSendRequest, ApiResponse } from '../../../types';

/** Sends OTP to the provided phone number */
export function useOtpSend() {
  return useMutation<ApiResponse<null>, unknown, OtpSendRequest>({
    mutationFn: async (data) => {
      const res = await apiClient.post<ApiResponse<null>>(ENDPOINTS.AUTH.SEND_OTP, data);
      return res.data;
    },
  });
}