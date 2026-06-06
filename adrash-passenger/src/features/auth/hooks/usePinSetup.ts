// src/features/auth/hooks/usePinSetup.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';

interface PinSetupPayload {
  /** The new 6-digit PIN. Sent as `pin` to match the verify endpoint. */
  pin: string;
  /** Only sent when changing an existing PIN (Profile → Security). */
  currentPin?: string | null;
}

/** Create or change the user's PIN (POST /auth/pin/setup). */
export function usePinSetup() {
  return useMutation<void, unknown, PinSetupPayload>({
    mutationFn: async ({ pin, currentPin }) => {
      // Field name is `pin` (the verify endpoint uses the same). `currentPin`
      // is only included when changing an existing PIN; on first-time setup it
      // is omitted entirely rather than sent as null.
      const body: Record<string, string> = { pin };
      if (currentPin) body.currentPin = currentPin;
      await apiClient.post(ENDPOINTS.AUTH.SETUP_PIN, body);
    },
  });
}
