// ─── ETB currency formatter ─────────────────────────────────────────────────

const ETB = new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Format amount as  'ETB 1,250.00' */
export function formatETB(amount: number): string {
    return ETB.format(amount);
}

/** Short form: 'ETB 1,250' (no decimals when whole number) */
export function formatETBShort(amount: number): string {
    return amount % 1 === 0
        ? `ETB ${amount.toLocaleString('en-ET')}`
        : formatETB(amount);
}