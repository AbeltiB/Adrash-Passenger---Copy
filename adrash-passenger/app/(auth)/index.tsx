// app/(auth)/index.tsx
// Language selection + splash screen shown to unauthenticated users.

import { useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenWrapper } from '../../src/components/layout/ScreenWrapper';
import { Colors, Spacing, BorderRadius } from '../../src/constants';

const ADRASH_LOGO = require('../../assets/Logo Adrash one.png');

// ─── Language options ────────────────────────────────────────────────────────

type Lang = 'en' | 'am' | 'om';

const LANGUAGES: { code: Lang; label: string; native: string }[] = [
    { code: 'en', label: 'English',  native: 'English'       },
    { code: 'am', label: 'Amharic',  native: 'አማርኛ'          },
    { code: 'om', label: 'Oromiffa', native: 'Afaan Oromoo'  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SplashScreen() {
    const [lang, setLang] = useState<Lang>('en');

    return (
        <ScreenWrapper
            edges={['top', 'bottom']}
            style={styles.container}
            noPadding
        >
            {/* Brand section */}
            <View style={styles.brandWrap}>
                <Image
                    source={ADRASH_LOGO}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.tagline}>Your journey, safely delivered.</Text>
            </View>

            {/* Language picker + CTA */}
            <View style={styles.langSection}>
                <Text style={styles.langTitle}>Choose your language</Text>

                {LANGUAGES.map((l) => {
                    const selected = lang === l.code;
                    return (
                        <Pressable
                            key={l.code}
                            style={[styles.langBtn, selected && styles.langBtnSelected]}
                            onPress={() => setLang(l.code)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            accessibilityLabel={l.label}
                        >
                            <Text
                                style={[
                                    styles.langText,
                                    selected && styles.langTextSelected,
                                ]}
                            >
                                {l.native}
                            </Text>
                            {selected && (
                                <Text style={styles.check}>✓</Text>
                            )}
                        </Pressable>
                    );
                })}

                <Pressable
                    style={styles.cta}
                    onPress={() => router.push('/(auth)/agreement')}
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
                >
                    <Text style={styles.ctaText}>Continue</Text>
                </Pressable>
            </View>
        </ScreenWrapper>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.xl,
        justifyContent: 'space-between',
    },

    // Brand
    brandWrap: {
        alignItems: 'center',
        marginTop: Spacing['4xl'],
    },
    logo: {
        width: 220,
        height: 110,
        marginBottom: Spacing.md,
    },
    tagline: {
        fontSize: 15,
        color: Colors.text.secondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },

    // Language section
    langSection: {
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    langTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginBottom: Spacing.sm,
    },
    langBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.border.light,
        borderRadius: BorderRadius.lg,
        paddingVertical: 14,
        paddingHorizontal: Spacing.base,
        backgroundColor: Colors.background.primary,   // ✔ was Colors.white
    },
    langBtnSelected: {
        borderColor: Colors.brand.primary,            // ✔ was Colors.primary
        backgroundColor: '#F1FAF4',
    },
    langText: {
        fontSize: 16,
        color: Colors.text.primary,
        fontWeight: '500',
    },
    langTextSelected: {
        color: Colors.brand.primary,                  // ✔ was Colors.primary
        fontWeight: '700',
    },
    check: {
        color: Colors.brand.primary,                  // ✔ was Colors.primary
        fontSize: 18,
        fontWeight: '700',
    },

    // CTA
    cta: {
        backgroundColor: Colors.brand.primary,        // ✔ was Colors.primary
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    ctaText: {
        color: Colors.neutral.white,                  // ✔ was Colors.white
        fontWeight: '700',
        fontSize: 16,
    },
});