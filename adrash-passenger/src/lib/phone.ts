// Canonical Ethiopian phone-number handling.
//
// Users may enter a phone in any of the common Ethiopian formats:
//   +251986990019  (E.164 with country code)
//   251986990019   (country code without +)
//   0986990019     (local with leading 0)
//   986990019      (bare 9-digit local)
// sanitizeLocalPhone normalises all of them to the bare 9-digit local part.

export const PHONE_LOCAL_LENGTH = 9;

/**
 * Extract the 9-digit local number from any Ethiopian phone format.
 * Strips the +251 / 251 country code or the leading 0 before slicing to 9 digits.
 */
export function sanitizeLocalPhone(input: string): string {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('251')) digits = digits.slice(3);
    else if (digits.startsWith('0')) digits = digits.slice(1);
    return digits.slice(0, PHONE_LOCAL_LENGTH);
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

/** Convert a local number (any format) to E.164 (+2519XXXXXXXX) for the API. */
export function toE164(localDigits: string): string {
    return `+251${sanitizeLocalPhone(localDigits)}`;
}

/** Carrier label derived from the local number's first digit. */
export function networkLabel(digits: string): string | null {
    if (digits.startsWith('9')) return 'Ethio Telecom';
    if (digits.startsWith('7')) return 'Safaricom ET';
    return null;
}
