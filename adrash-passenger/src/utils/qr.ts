// ─── QR ticket helpers ───────────────────────────────────────────────────────
// TODO: integrate a QR rendering library (e.g. react-native-qrcode-svg)

/** Returns the raw data string to encode in the QR code */
export function buildQrPayload(bookingId: string, reference: string): string {
    return JSON.stringify({ bid: bookingId, ref: reference, app: 'adrash', v: 1 });
}