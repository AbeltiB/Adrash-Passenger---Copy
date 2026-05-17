// src/features/auth/hooks/usePinSetup.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';

interface PinSetupPayload {
  newPin: string;
  currentPin: string | null;
}

/** Create or change the user's PIN. `currentPin` is required only when changing an existing PIN. */
export function usePinSetup() {
  return useMutation<void, unknown, PinSetupPayload>({
    mutationFn: async (data) => {
      await apiClient.post(ENDPOINTS.AUTH.SETUP_PIN, data);
    },
  });
}