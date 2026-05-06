// ─── Adrash Passenger — Colour Tokens ──────────────────────────────────────

export const Colors = {
    brand: {
        primary: '#1A6B3C',
        primaryDark: '#0D4A2A',
        primaryLight: '#2D9A58',
        secondary: '#F5A623',
        secondaryDark: '#D4891A',
        secondaryLight: '#F7BE5E',
    },
    neutral: {
        white: '#FFFFFF', black: '#000000', gray50: '#F9FAFB', gray100: '#F3F4F6',
        gray200: '#E5E7EB', gray300: '#D1D5DB', gray400: '#9CA3AF', gray500: '#6B7280',
        gray600: '#4B5563', gray700: '#374151', gray800: '#1F2937', gray900: '#111827',
    },
    semantic: {
        success: '#16A34A', successLight: '#DCFCE7',
        warning: '#D97706', warningLight: '#FEF3C7',
        error: '#DC2626', errorLight: '#FEE2E2',
        info: '#2563EB', infoLight: '#DBEAFE',
    },
    payment: {
        telebirr: '#6B21A8', cbeBirr: '#1E40AF', awash: '#92400E',
    },
    seat: {
        available: '#DCFCE7', availableBorder: '#16A34A',
        occupied: '#FEE2E2', occupiedBorder: '#DC2626',
        selected: '#1A6B3C', selectedText: '#FFFFFF',
    },
    background: {
        primary: '#FFFFFF', secondary: '#F9FAFB', tertiary: '#F3F4F6',
    },
    text: {
        primary: '#111827', secondary: '#374151', tertiary: '#6B7280',
        disabled: '#9CA3AF', inverse: '#FFFFFF', link: '#1A6B3C',
    },
    border: {
        light: '#E5E7EB', medium: '#D1D5DB', dark: '#9CA3AF',
    },
} as const;

export type Colors = typeof Colors;