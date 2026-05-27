// ─── Adrash Passenger — Colour Tokens ───────────────────────────────────────
//
// Brand palette extracted directly from the Adrash logo:
//   Primary blue:   #13598A  (dominant brand blue)
//   Primary dark:   #0C3A5C  (deep navy — headers, dark surfaces)
//   Primary light:  #2285C8  (lighter blue — hover states, accents)
//   Primary tint:   #E8F2FA  (very light blue — replaces all #F1FAF4 greens)
//   On-primary:     #C8E0F0  (muted light blue text on dark blue cards)
//
// The green (#1A6B3C) that was here previously had no connection to the brand.

export const Colors = {
    brand: {
        primary:      '#13598A',   // logo dominant blue
        primaryDark:  '#0C3A5C',   // deep navy
        primaryLight: '#2285C8',   // lighter blue accent
        primaryTint:  '#E8F2FA',   // very light blue surface (was green #F1FAF4)
        onPrimary:    '#C8E0F0',   // text/icons on dark blue surfaces
        secondary:    '#1E96D4',   // sky blue — secondary CTAs
    },
    neutral: {
        white:   '#FFFFFF',
        black:   '#000000',
        gray50:  '#F9FAFB',
        gray100: '#F3F4F6',
        gray200: '#E5E7EB',
        gray300: '#D1D5DB',
        gray400: '#9CA3AF',
        gray500: '#6B7280',
        gray600: '#4B5563',
        gray700: '#374151',
        gray800: '#1F2937',
        gray900: '#111827',
    },
    semantic: {
        success:      '#16A34A',
        successLight: '#DCFCE7',
        warning:      '#D97706',
        warningLight: '#FEF3C7',
        error:        '#DC2626',
        errorLight:   '#FEE2E2',
        info:         '#2285C8',   // aligned to brand light blue
        infoLight:    '#DBEAFE',
    },
    payment: {
        telebirr: '#6B21A8',
        cbeBirr:  '#1E40AF',
        awash:    '#92400E',
    },
    seat: {
        available:       '#DBEAFE',   // light blue (was green)
        availableBorder: '#2285C8',   // brand light blue
        occupied:        '#FEE2E2',
        occupiedBorder:  '#DC2626',
        selected:        '#13598A',   // brand primary (was green)
        selectedText:    '#FFFFFF',
    },
    background: {
        primary:   '#FFFFFF',
        secondary: '#F4F8FB',   // very subtle blue-tinted off-white (was neutral gray)
        tertiary:  '#E8F2FA',   // brand tint (was #F3F4F6 gray)
    },
    text: {
        primary:  '#111827',
        secondary: '#374151',
        tertiary:  '#6B7280',
        disabled:  '#9CA3AF',
        inverse:   '#FFFFFF',
        link:      '#13598A',   // brand blue (was green)
    },
    border: {
        light:  '#E5E7EB',
        medium: '#D1D5DB',
        dark:   '#9CA3AF',
    },
} as const;

export type ColorTokens = typeof Colors;