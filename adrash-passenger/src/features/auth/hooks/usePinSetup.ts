// src/features/auth/hooks/usePinSetup.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';

interface PinSetupPayload {
  /** The new 6-digit PIN. Backend field is `NewPin`. */
  newPin: string;
  /** Only sent when changing an existing PIN (Profile → Security). */
  currentPin?: string | null;
}

/** Create or change the user's PIN (POST /auth/pin/setup). */
export function usePinSetup() {
  return useMutation<void, unknown, PinSetupPayload>({
    mutationFn: async ({ newPin, currentPin }) => {
      // `currentPin` is only included when changing an existing PIN. On
      // first-time setup it is omitted entirely — sending it as null tripped
      // the server's validator (422).
      const body: Record<string, string> = { newPin };
      if (currentPin) body.currentPin = currentPin;
      await apiClient.post(ENDPOINTS.AUTH.SETUP_PIN, body);
    },
  });
}
