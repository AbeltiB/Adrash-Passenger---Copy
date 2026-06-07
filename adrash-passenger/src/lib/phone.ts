// Canonical Ethiopian phone-number handling.
//
// The +251 country code is always implied (prefilled in the UI). A subscriber
// number is exactly 9 digits and starts with 9 (Ethio Telecom) or 7 (Safaricom).
// A leading 0 is NOT accepted anywhere — it is stripped on input so the user
// only ever enters the 9-digit local part (e.g. 911XXXXXX or 711XXXXXX).

export const PHONE_LOCAL_LENGTH = 9;

/**
 * Reduce arbitrary input to a clean local number: digits only, any leading
 * zeros removed, capped at 9 digits. Use this in onChangeText so a typed/pasted
 * "0" or "09…" collapses to the bare local number.
 */
export function sanitizeLocalPhone(input: string): string {
    return input
        .replace(/\D/g, '')
        .replace(/^0+/, '')
        .slice(0, PHONE_LOCAL_LENGTH);
}

/** True when the local part is exactly 9 digits starting with 9 or 7. */
export function isValidLocalPhone(digits: string): boolean {
    return /^[79]\d{8}$/.test(digits);
}

/** Group a local number as "9XX XXX XXX" for display in the input. */
export function formatLocalPhone(digits: string): string {
    const d = digits.replace(/\D/g, '');
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
}

/** Convert a local number to E.164 (+2519XXXXXXXX) for the API. */
export function toE164(localDigits: string): string {
    return `+251${sanitizeLocalPhone(localDigits)}`;
}

/** Carrier label derived from the local number's first digit. */
export function networkLabel(digits: string): string | null {
    if (digits.startsWith('9')) return 'Ethio Telecom';
    if (digits.startsWith('7')) return 'Safaricom ET';
    return null;
}
