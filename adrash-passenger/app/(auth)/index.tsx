// app/(auth)/index.tsx
// Splash + language selector.
//
// Routing logic on mount:
//   1. Read saved language → initialise i18n
//   2. Check SecureStore for access token + device token
//      a. Token valid + agreement current        → /(tabs)                [straight to home]
//      b. Token valid + new agreement             → /(auth)/agreement      [re-accept]
//      c. Token expired + refresh succeeds        → same as (a)/(b) above  [silent session resume]
//      d. Token/refresh both invalid + deviceToken → /(auth)/phone-login   [phone → OTP]
//      e. No token / no device token               → show language selector → agreement → phone → OTP
//
// (c) matters because access tokens are short-lived but refresh tokens are
// valid up to 90 days server-side — without this step, every user would be
// bounced to a fresh phone/OTP login as often as the access token expires.

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { LANGUAGES, toApiLanguage } from '../../src/lib/languages';
import type { Language } from '../../src/types';
import { writeString } from '../../src/lib/storage';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { apiClient, refreshAccessToken } from '../../src/api/client';
import { ENDPOINTS } from '../../src/api/endpoints';
import {
    clearTokens,
    getAccessToken,
    getDeviceToken,
    isTokenExpired,
} from '../../src/features/auth/utils/token';

export default function SplashScreen() {
    const { t, i18n } = useTranslation();
    // Seeded from the language actually active right now (i18n is the live
    // source of truth), not a hardcoded default. Previously this always
    // started at 'en' on every mount — harmless the first time the app ever
    // opens, but wrong the moment this screen is revisited (e.g. the user
    // picks Amharic, moves on to the agreement screen, taps "I do not
    // agree", and lands back here): the app was still correctly running in
    // Amharic, but the radio list showed English selected because this local
    // state silently reset while the real language didn't.
    const [selected, setSelected] = useState<Language>(() => (
        (i18n.resolvedLanguage ?? i18n.language) as Language
    ) || 'en');
    const [checking, setChecking] = useState(true);

    const hasAcceptedAgreement = useAuthStore((s) => s.hasAcceptedAgreement);
    const agreementVersion     = useAuthStore((s) => s.agreementVersion);
    const preferredLanguage    = useAuthStore((s) => s.preferredLanguage);
    const setAuthenticated     = useAuthStore((s) => s.setAuthenticated);
    const setAuthInitialized   = useAuthStore((s) => s.setAuthInitialized);
    const setLanguage          = useAuthStore((s) => s.setLanguage);

    // Token is valid (or was just silently refreshed) → check the legal
    // agreement and land the user in the app. Shared by both the "access
    // token still valid" path and the "silent refresh succeeded" path below.
    const proceedAuthenticated = useCallback(async () => {
        // Set this immediately so the (tabs)/_layout.tsx guard doesn't redirect
        // the user back out while the agreement check below is in flight.
        setAuthenticated(true);

        // ── Agreement check ──────────────────────────────────────────────
        // Fast path: user has never accepted on this device → go to
        // agreement without a network round-trip.
        if (!hasAcceptedAgreement) {
            router.replace({
                pathname: '/(auth)/agreement',
                params: { reaccept: '1', next: 'tabs' },
            });
            return;
        }

        // Slow path: ask the server if the current version is signed.
        // isSigned = false means a new agreement was published since
        // the user last accepted. On any network error let them in —
        // the 403 interceptor will catch it on the next request.
        try {
            const lang = toApiLanguage(preferredLanguage);
            const res  = await apiClient.get<unknown>(
                ENDPOINTS.AGREEMENTS.CURRENT,
                { params: { type: 'Passenger', lang } },
            );
            const raw  = res.data as Record<string, unknown>;
            const data = (raw?.data as Record<string, unknown>) ?? raw;

            // isSigned is the server's authoritative flag.
            // false → the user hasn't signed the CURRENT version.
            const isSigned =
                data?.isSigned === true || data?.accepted === true;

            // Short-circuit: if the locally stored acceptance version
            // matches the server's current version, trust the local
            // record — this prevents a re-accept loop caused by server
            // propagation lag or a stale isSigned flag.
            const serverVersion = data?.version as string | undefined;
            const alreadyAcceptedCurrentVersion =
                hasAcceptedAgreement &&
                agreementVersion != null &&
                serverVersion != null &&
                serverVersion === agreementVersion;

            if (!isSigned && !alreadyAcceptedCurrentVersion) {
                router.replace({
                    pathname: '/(auth)/agreement',
                    params: { reaccept: '1', next: 'tabs' },
                });
                return;
            }
        } catch {
            // Network / parse error — let the user in, the
            // 403 interceptor will handle it on the next request.
        }

        router.replace('/(tabs)');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasAcceptedAgreement, agreementVersion, preferredLanguage]);

    // ── On mount: decide where to send the user ───────────────────────────
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
                    await proceedAuthenticated();
                    return;
                }

                // Access token is missing or has aged out — before treating this
                // as "logged out", try a silent refresh. Refresh tokens rotate on
                // every use and stay valid up to 90 days server-side, so a user
                // who simply hasn't opened the app in a while should not be
                // bounced to phone/OTP just because the short-lived access token
                // expired; only a genuinely invalid/expired/revoked refresh token
                // should force that.
                try {
                    await refreshAccessToken();
                    await proceedAuthenticated();
                    return;
                } catch {
                    await clearTokens();
                }

                // Refresh token is gone/invalid too — this device has been
                // registered before → send to phone-login (phone number, OTP).
                if (deviceToken) {
                    router.replace('/(auth)/phone-login');
                    return;
                }

                // Completely fresh — show language selector, then OTP onboarding.
            } catch {
                // Any error → show language selector (safe fallback)
            } finally {
                setChecking(false);
                setAuthInitialized();
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectLanguage = useCallback(async (lang: Language) => {
        setSelected(lang);
        await changeLanguage(lang);
        writeString(MMKVKeys.PREFERRED_LANGUAGE, lang);
        setLanguage(lang);
    }, [setLanguage]);

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
                <Text style={styles.tagline}>{t('auth.splash.tagline')}</Text>
            </View>

            <View style={styles.langSection}>
                <Text style={styles.langHeading}>{t('auth.language.title')}</Text>

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
                                {l.nativeLabel}
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
                    <Text style={styles.ctaText}>{t('common.continue')}</Text>
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
    logo:    { width: 220, height: 110, marginBottom: Spacing.md },
    tagline: { fontSize: 15, color: Colors.text.secondary, marginTop: Spacing.sm, textAlign: 'center' },
    langSection: { gap: Spacing.md, marginBottom: Spacing.lg },
    langHeading: {
        fontSize: 16, fontWeight: '600',
        color: Colors.text.secondary, marginBottom: Spacing.sm,
    },
    langBtn: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1.5, borderColor: Colors.border.light,
        borderRadius: BorderRadius.lg, paddingVertical: 14,
        paddingHorizontal: Spacing.base, backgroundColor: Colors.background.primary,
    },
    langBtnActive: { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primaryTint },
    langText:      { fontSize: 16, color: Colors.text.primary, fontWeight: '500' },
    langTextActive: { color: Colors.brand.primary, fontWeight: '700' },
    check: { color: Colors.brand.primary, fontSize: 18, fontWeight: '700' },
    cta: {
        backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md,
    },
    ctaText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 16 },
});