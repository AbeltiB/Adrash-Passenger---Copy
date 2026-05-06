import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import type { OtpSendRequest } from '../../../types';

/** Sends an OTP to the provided phone number through the real auth API. */
export function useOtpSend() {
  return useMutation<void, unknown, OtpSendRequest>({
    mutationFn: async (data) => {
      await apiClient.post(ENDPOINTS.AUTH.SEND_OTP, data);
    },
  });
}
