// Product decision (temporary): PIN sign-in is switched off — every login goes
// through OTP instead. The PIN setup/verify screens, hooks, and API calls are
// left in place so this can be flipped back on later without rebuilding them.
export const PIN_LOGIN_ENABLED = false;

// ── Reviewer / QA test accounts ────────────────────────────────────────────
// Two fixed, non-phone-shaped login IDs (short, memorable, impossible to
// confuse with a real Ethiopian number) so app-store reviewers and internal
// testers can log in without a real SIM to receive an SMS code.
//
// IMPORTANT — this constant only lets these two values PAST the client-side
// phone-format check so they reach the normal send-OTP/verify-OTP screens.
// It does not itself grant a session: `/auth/otp/verify` still has to accept
// phone="1234"/"9876" + code="000000" and return a real token for login to
// actually succeed. That recognition must exist on the backend — the client
// cannot forge a valid session on its own, and shouldn't try to; a client-side
// auth bypass would be readable by anyone who unpacks the app bundle. If the
// backend doesn't yet special-case these two values, this allowlist alone
// will just let the request through to a normal "invalid code" rejection,
// same as any wrong OTP today — it fails safely either way.
export const TEST_LOGIN_NUMBERS = ['1234', '9876'] as const;
export const TEST_LOGIN_OTP = '000000';

export function isTestLoginNumber(rawDigitsOnly: string): boolean {
    return (TEST_LOGIN_NUMBERS as readonly string[]).includes(rawDigitsOnly);
}
