// app/(auth)/index.tsx
// Splash + language selector.
//
// Routing logic on mount:
//   1. Read saved language → initialise i18n
//   2. Check SecureStore for access token
//      a. Token valid + agreement current  → /(tabs)            [home]
//      b. Token valid + new agreement      → /(auth)/agreement  [re-accept then PIN then home]
//      c. Token expired + deviceToken      → /(auth)/pin-login  [PIN login directly]
//      d. No token / no device token       → show language selector → agreement → phone → OTP

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
import {
    getAccessToken,
    getDeviceToken,
    isTokenExpired,
} from '../../src/features/auth/utils/token';

type Lang = 'en' | 'am' | 'om';

const LANGUAGES: { code: Lang; native: string; label: string }[] = [
    { code: 'en', native: 'English',      label: 'English'  },
    { code: 'am', native: 'አማርኛ',         label: 'Amharic'  },
    { code: 'om', native: 'Afaan Oromoo', label: 'Oromiffa' },
];

export default function SplashScreen() {
    const [selected, setSelected]   = useState<Lang>('en');
    const [checking, setChecking]   = useState(true);

    const hasAcceptedAgreement   = useAuthStore((s) => s.hasAcceptedAgreement);
    const setLanguage            = useAuthStore((s) => s.setLanguage);

    // ── On mount: decide where to send the user ───────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const [token, expired, deviceToken] = await Promise.all([
                    getAccessToken(),
                    isTokenExpired(),
                    getDeviceToken(),
                ]);

                const hasValidToken = token !== null && !expired;

                if (hasValidToken) {
                    // Valid session — check agreement state
                    if (!hasAcceptedAgreement) {
                        // Authenticated but agreement not yet accepted
                        router.replace('/(auth)/agreement');
                        return;
                    }
                    // Fully authenticated + agreement current → home
                    router.replace('/(tabs)');
                    return;
                }

                // Token expired or missing — check if we have a device token
                // so we can offer PIN login instead of full OTP flow
                if (deviceToken) {
                    router.replace('/(auth)/pin-login');
                    return;
                }

                // No token and no device token → fresh install / logged out
                // Fall through to show the language selector
            } catch {
                // Any error → show language selector (safe fallback)
            } finally {
                setChecking(false);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Language selection ────────────────────────────────────────────────────
    const handleSelectLanguage = useCallback(async (lang: Lang) => {
        setSelected(lang);
        await changeLanguage(lang);
        writeString(MMKVKeys.PREFERRED_LANGUAGE, lang);
        setLanguage(lang);
    }, [setLanguage]);

    // ── Continue button ───────────────────────────────────────────────────────
    const handleContinue = useCallback(() => {
        router.push('/(auth)/agreement');
    }, []);

    if (checking) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.brand}>
                <Image
                    source={ADRASH_LOGO}
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityLabel="Adrash logo"
                />
                <Text style={styles.tagline}>Your journey, safely delivered.</Text>
            </View>

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
