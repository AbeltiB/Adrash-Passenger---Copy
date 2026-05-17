// app/(auth)/index.tsx
// Splash + language selector.
//
// Flow:
//   1. Show logo + animated tagline
//   2. Show 3 language buttons
//   3. User taps a language → stored in MMKV, i18n updated immediately
//   4. "Continue" → navigate to agreement screen
//   5. Returning user with valid tokens → skip straight to tabs (biometric path)

import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ADRASH_LOGO from '../../assets/Logo Adrash one.png';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { MMKVKeys } from '../../src/constants/mmkvKeys';
import { changeLanguage } from '../../src/lib/i18n';
import { writeString } from '../../src/lib/storage';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { getAccessToken } from '../../src/features/auth/utils/token';


// ─── Language options ─────────────────────────────────────────────────────────

type Lang = 'en' | 'am' | 'om';

const LANGUAGES: { code: Lang; native: string; label: string }[] = [
    { code: 'en', native: 'English',      label: 'English'      },
    { code: 'am', native: 'አማርኛ',         label: 'Amharic'      },
    { code: 'om', native: 'Afaan Oromoo', label: 'Oromiffa'     },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SplashScreen() {
    const [selected, setSelected] = useState<Lang>('en');
    const [checking, setChecking]  = useState(true);

    const isAuthenticated        = useAuthStore((s) => s.isAuthenticated);
    const hasAcceptedAgreement   = useAuthStore((s) => s.hasAcceptedAgreement);
    const setLanguage            = useAuthStore((s) => s.setLanguage);

    // ── On mount: check for existing session ──────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const token = await getAccessToken();
                if (token && isAuthenticated) {
                    if (hasAcceptedAgreement) {
                        // Returning user — go straight to tabs
                        router.replace('/(tabs)');
                        return;
                    }
                    // Authenticated but never accepted agreement
                    router.replace('/(auth)/agreement');
                    return;
                }
            } catch {
                // No valid token — fall through to language selector
            } finally {
                setChecking(false);
            }
        })();
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Language selection ────────────────────────────────────────────────────
    const handleSelectLanguage = useCallback(async (lang: Lang) => {
        if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[Language] selected:', lang);
        }

        setSelected(lang);
        // Update i18n immediately so next screen renders in the right language
        await changeLanguage(lang);
        // Persist so the store and future launches restore the preference
        writeString(MMKVKeys.PREFERRED_LANGUAGE, lang);
        setLanguage(lang);
    }, [setLanguage]);

    // ── Continue ──────────────────────────────────────────────────────────────
    const handleContinue = useCallback(() => {
        if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[Language] continuing with:', selected);
        }

        // The agreement screen reads the active i18n language automatically,
        // so no params need to be passed.
        router.push('/(auth)/agreement');
    }, [selected]);

    // ── Loading state while checking tokens ───────────────────────────────────
    if (checking) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Brand */}
            <View style={styles.brand}>
                <Image
                    source={ADRASH_LOGO}
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityLabel="Adrash logo"
                />
                <Text style={styles.tagline}>Your journey, safely delivered.</Text>
            </View>

            {/* Language picker */}
            <View style={styles.langSection}>
                <Text style={styles.langHeading}>Choose your language</Text>

                {LANGUAGES.map((l) => {
                    const active = selected === l.code;
                    return (
                        <Pressable
                            key={l.code}
                            style={[styles.langBtn, active && styles.langBtnActive]}
                            onPress={() => handleSelectLanguage(l.code)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                            accessibilityLabel={l.label}
                        >
                            <Text style={[styles.langText, active && styles.langTextActive]}>
                                {l.native}
                            </Text>
                            {active && <Text style={styles.check}>✓</Text>}
                        </Pressable>
                    );
                })}

                <Pressable
                    style={styles.cta}
                    onPress={handleContinue}
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
                >
                    <Text style={styles.ctaText}>Continue</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.primary,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'space-between',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background.primary,
    },

    brand: {
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

    langSection: {
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    langHeading: {
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
        backgroundColor: Colors.background.primary,
    },
    langBtnActive: {
        borderColor: Colors.brand.primary,
        backgroundColor: '#F1FAF4',
    },
    langText: {
        fontSize: 16,
        color: Colors.text.primary,
        fontWeight: '500',
    },
    langTextActive: {
        color: Colors.brand.primary,
        fontWeight: '700',
    },
    check: {
        color: Colors.brand.primary,
        fontSize: 18,
        fontWeight: '700',
    },

    cta: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    ctaText: {
        color: Colors.neutral.white,
        fontWeight: '700',
        fontSize: 16,
    },
});