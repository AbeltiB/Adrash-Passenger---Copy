// ─── Typography Tokens ──────────────────────────────────────────────────────
// Replace FontFamily values with expo-font loaded custom fonts when ready.

export const FontFamily = {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    // TODO: 'NotoSansEthiopic-Regular' etc. after font loading
} as const;

export const FontSize = {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
} as const;

const TL = { tight: 1.25, normal: 1.5, relaxed: 1.75 };

export const TextStyles = {
    h1: { fontSize: FontSize['3xl'], fontFamily: FontFamily.bold, lineHeight: FontSize['3xl'] * TL.tight },
    h2: { fontSize: FontSize['2xl'], fontFamily: FontFamily.bold, lineHeight: FontSize['2xl'] * TL.tight },
    h3: { fontSize: FontSize.xl, fontFamily: FontFamily.semibold, lineHeight: FontSize.xl * TL.tight },
    h4: { fontSize: FontSize.lg, fontFamily: FontFamily.semibold, lineHeight: FontSize.lg * TL.normal },
    bodyLarge: { fontSize: FontSize.md, fontFamily: FontFamily.regular, lineHeight: FontSize.md * TL.normal },
    body: { fontSize: FontSize.base, fontFamily: FontFamily.regular, lineHeight: FontSize.base * TL.normal },
    bodySmall: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, lineHeight: FontSize.sm * TL.normal },
    label: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, lineHeight: FontSize.sm * TL.normal },
    caption: { fontSize: FontSize.xs, fontFamily: FontFamily.regular, lineHeight: FontSize.xs * TL.normal },
} as const;