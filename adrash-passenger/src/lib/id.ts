// React Native / Hermes has no global `crypto`, so `crypto.randomUUID()` throws
// "Property 'crypto' doesn't exist". This generates a v4-style UUID with
// Math.random — sufficient for request idempotency keys (we need uniqueness,
// not cryptographic randomness).
export function uuidv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
