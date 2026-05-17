// src/features/auth/hooks/useOtpSend.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';

interface OtpSendPayload {
  phone: string;
}

/** Sends an OTP to the provided phone number. API expects { phone } in E.164 format. */
export function useOtpSend() {
  return useMutation<void, unknown, OtpSendPayload>({
    mutationFn: async (data) => {
      await apiClient.post(ENDPOINTS.AUTH.SEND_OTP, data);
    },
  });
}