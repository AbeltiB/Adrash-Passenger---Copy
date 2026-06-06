// app/(auth)/phone-login.tsx
//
// Returning-user login screen.
//
// Step 1 — Enter phone number (pre-filled from SecureStore if available)
// Step 2 — If this device has a device-token for that phone → show PIN pad
//           Otherwise → send OTP and route to /(auth)/otp  (new device flow)
//
// "Use OTP instead" link lets users explicitly bypass PIN (e.g. forgot PIN,
// want to reset it, or are on a shared device).
//
// "Sign in with a different account" clears device data and returns to splash.

import { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import {
    formatLocalPhone,
    isValidLocalPhone,
    sanitizeLocalPhone,
    toE164,
} from '../../src/lib/phone';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { usePinVerify } from '../../src/features/auth/hooks/usePinVerify';
import { useOtpSend } from '../../src/features/auth/hooks/useOtpSend';
import {
    clearAllSecureData,
    getDevicePhone,
    getDeviceToken,
} from '../../src/features/auth/utils/token';

const PIN_LENGTH = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(raw: string): string {
    return toE164(raw);
}

function isValidEthiopianPhone(raw: string): boolean {
    return isValidLocalPhone(sanitizeLocalPhone(raw));
}

function displayPhone(raw: string): string {
    return formatLocalPhone(raw);
}

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
        const res = (error as { response?: { data?: { message?: string } } }).response;
        return res?.data?.message ?? 'Incorrect PIN. Please try again.';
    }
    if (error instanceof Error) return error.message;
    return 'Something went wrong. Please try again.';
}

// ─── PIN dots ─────────────────────────────────────────────────────────────────

function PinDots({ filled, hasError }: { filled: number; hasError: boolean }) {
    return (
        <View style={dotStyles.row}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        dotStyles.dot,
                        i < filled && (hasError ? dotStyles.dotError : dotStyles.dotFilled),
                    ]}
                />
            ))}
        </View>
    );
}

const dotStyles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginVertical: Spacing.lg },
    dot: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 2, borderColor: Colors.border.medium, backgroundColor: 'transparent',
    },
    dotFilled: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
    dotError:  { backgroundColor: Colors.semantic.error,  borderColor: Colors.semantic.error  },
});

// ─── Numpad ───────────────────────────────────────────────────────────────────

function NumPad({ onPress, onDelete, disabled }: {
    onPress:  (n: string) => void;
    onDelete: () => void;
    disabled: boolean;
}) {
    // Explicit rows guarantee 3 columns on every screen size without
    // relying on flexWrap floating-point rounding.
    const rows: string[][] = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];
    return (
        <View style={padStyles.grid}>
            {rows.map((row, ri) => (
                <View key={ri} style={padStyles.row}>
                    {row.map((k, ki) => {
                        if (k === '') return <View key={ki} style={padStyles.empty} />;
                        const isDel = k === '⌫';
                        return (
                            <Pressable
                                key={ki}
                                style={({ pressed }) => [
                                    padStyles.key,
                                    pressed && !disabled && padStyles.keyPressed,
                                    disabled && padStyles.keyDisabled,
                                ]}
                                onPress={() => !disabled && (isDel ? onDelete() : onPress(k))}
                                accessibilityLabel={isDel ? 'Delete' : k}
                            >
                                <Text style={[padStyles.keyText, isDel && padStyles.deleteText]}>{k}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

const padStyles = StyleSheet.create({
    grid:        { alignSelf: 'center', width: 300 },
    row:         { flexDirection: 'row' },
    empty:       { flex: 1, height: 72 },
    key:         { flex: 1, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.lg },
    keyPressed:  { backgroundColor: Colors.background.tertiary },
    keyDisabled: { opacity: 0.4 },
    keyText:     { fontSize: 26, fontWeight: '600', color: Colors.text.primary },
    deleteText:  { fontSize: 22 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

type Step = 'phone' | 'pin';

export default function PhoneLoginScreen() {
    const { t } = useTranslation();
    const [step, setStep]         = useState<Step>('phone');
    const [rawPhone, setRawPhone] = useState('');   // digits only, no +251
    const [pin, setPin]           = useState('');
    const [hasError, setHasError] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [deviceToken, setDeviceToken] = useState<string | null>(null);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const user      = useAuthStore((s) => s.user);
    const logout    = useAuthStore((s) => s.logout);

    const { mutate: verifyPin, isPending: pinPending } = usePinVerify();
    const { mutate: sendOtp,   isPending: otpPending  } = useOtpSend();

    // Pre-fill phone from SecureStore on mount
    useEffect(() => {
        getDevicePhone().then((stored) => {
            if (!stored) return;
            // stored is E.164 like +2519XXXXXXXX — keep just the 9-digit local part
            setRawPhone(sanitizeLocalPhone(stored.replace(/^\+251/, '')));
        });
        getDeviceToken().then(setDeviceToken);
    }, []);

    const shake = useCallback(() => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    // ── Step 1: phone submitted ───────────────────────────────────────────
    const handlePhoneContinue = useCallback(async () => {
        if (!isValidEthiopianPhone(rawPhone)) return;
        const normalised = normalisePhone(rawPhone);
        const dt = await getDeviceToken();

        if (dt) {
            // This device has a registered device-token → show PIN pad
            setDeviceToken(dt);
            setStep('pin');
        } else {
            // New device (or device data cleared) → OTP flow
            sendOtp(
                { phone: normalised },
                {
                    onSuccess: () =>
                        router.replace({ pathname: '/(auth)/otp', params: { phone: normalised } }),
                    onError: (err) => setErrorMsg(getErrorMessage(err)),
                },
            );
        }
    }, [rawPhone, sendOtp]);

    // ── Step 2: PIN digit pressed ─────────────────────────────────────────
    const handlePinPress = useCallback((n: string) => {
        if (pinPending) return;
        const next = pin + n;
        if (next.length > PIN_LENGTH) return;
        setPin(next);
        setHasError(false);
        setErrorMsg('');

        if (next.length === PIN_LENGTH) {
            const phone = normalisePhone(rawPhone);
            if (!deviceToken || !phone) {
                router.replace('/(auth)');
                return;
            }

            verifyPin(
                { phone, pin: next, deviceToken },
                {
                    onSuccess: (result) => {
                        if (result.agreementRequired) {
                            router.replace({
                                pathname: '/(auth)/agreement',
                                params: { reaccept: '1', next: 'tabs' },
                            });
                        } else {
                            router.replace('/(tabs)');
                        }
                    },
                    onError: (error) => {
                        setErrorMsg(getErrorMessage(error));
                        const nextAttempts = attempts + 1;
                        setAttempts(nextAttempts);
                        setHasError(true);
                        shake();
                        setPin('');
                        setTimeout(() => setHasError(false), 800);

                        // After 5 failed attempts → force OTP for security
                        if (nextAttempts >= 5) {
                            const normalised = normalisePhone(rawPhone);
                            sendOtp(
                                { phone: normalised },
                                {
                                    onSuccess: () =>
                                        router.replace({
                                            pathname: '/(auth)/otp',
                                            params: { phone: normalised },
                                        }),
                                },
                            );
                        }
                    },
                },
            );
        }
    }, [pin, pinPending, rawPhone, deviceToken, verifyPin, attempts, shake, sendOtp]);

    const handlePinDelete = useCallback(() => {
        if (pinPending) return;
        setPin((p) => p.slice(0, -1));
        setHasError(false);
        setErrorMsg('');
    }, [pinPending]);

    // Use OTP instead (explicit user choice)
    const handleUseOtp = useCallback(() => {
        const normalised = normalisePhone(rawPhone);
        sendOtp(
            { phone: normalised },
            {
                onSuccess: () =>
                    router.replace({ pathname: '/(auth)/otp', params: { phone: normalised } }),
                onError: (err) => setErrorMsg(getErrorMessage(err)),
            },
        );
    }, [rawPhone, sendOtp]);

    // Sign in with a different account
    const handleSwitchAccount = useCallback(async () => {
        await clearAllSecureData();
        logout();
        router.replace('/(auth)');
    }, [logout]);

    const normalisedPhone = normalisePhone(rawPhone);
    const displayName     = user?.firstName ?? null;

    // ── Render: phone entry step ──────────────────────────────────────────
    if (step === 'phone') {
        const valid    = isValidEthiopianPhone(rawPhone);
        const isPending = otpPending;

        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.content}>
                    <View style={styles.iconWrap}>
                        <Text style={styles.iconEmoji}>📱</Text>
                    </View>

                    <Text style={styles.title}>{t('auth.phone_login.title')}</Text>
                    <Text style={styles.subtitle}>{t('auth.phone_login.phone_subtitle')}</Text>

                    {/* Phone input */}
                    <View style={styles.inputRow}>
                        <View style={styles.flagBox}>
                            <Text style={styles.flag}>🇪🇹</Text>
                            <Text style={styles.flagCode}>+251</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="phone-pad"
                            placeholder="9XX XXX XXX"
                            placeholderTextColor={Colors.text.disabled}
                            value={displayPhone(rawPhone)}
                            onChangeText={(t) => setRawPhone(sanitizeLocalPhone(t))}
                            maxLength={11}
                            returnKeyType="done"
                            onSubmitEditing={handlePhoneContinue}
                            editable={!isPending}
                            autoFocus
                        />
                    </View>

                    {errorMsg ? (
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    ) : null}

                    <Pressable
                        style={[styles.cta, (!valid || isPending) && styles.ctaDisabled]}
                        onPress={handlePhoneContinue}
                        disabled={!valid || isPending}
                    >
                        {isPending ? (
                            <ActivityIndicator color={Colors.neutral.white} />
                        ) : (
                            <Text style={styles.ctaText}>{t('common.continue')}</Text>
                        )}
                    </Pressable>
                </View>

                <Pressable style={styles.switchBtn} onPress={handleSwitchAccount}>
                    <Text style={styles.switchText}>{t('auth.phone_login.switch_account')}</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    // ── Render: PIN pad step ──────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Pressable
                style={styles.back}
                onPress={() => { setStep('phone'); setPin(''); setErrorMsg(''); }}
                disabled={pinPending}
            >
                <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <View style={styles.content}>
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>
                        {displayName ? displayName[0].toUpperCase() : '👤'}
                    </Text>
                </View>

                <Text style={styles.title}>
                    {displayName ? `${t('auth.phone_login.title')}, ${displayName}` : t('auth.phone_login.title')}
                </Text>
                <Text style={styles.subtitle}>{normalisedPhone}</Text>
                <Text style={styles.pinHint}>{t('auth.phone_login.pin_hint')}</Text>

                {/* PIN dots */}
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <PinDots filled={pin.length} hasError={hasError} />
                </Animated.View>

                {errorMsg ? (
                    <Text style={styles.errorText}>{errorMsg}</Text>
                ) : null}
                {attempts > 0 && attempts < 5 ? (
                    <Text style={styles.errorText}>
                        {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining
                    </Text>
                ) : null}

                {pinPending ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={Colors.brand.primary} />
                    </View>
                ) : (
                    <NumPad
                        onPress={handlePinPress}
                        onDelete={handlePinDelete}
                        disabled={pinPending}
                    />
                )}

                {/* Forgot PIN / use OTP */}
                <Pressable
                    style={styles.otpLink}
                    onPress={handleUseOtp}
                    disabled={otpPending}
                >
                    <Text style={styles.otpLinkText}>
                        {otpPending ? t('auth.phone_login.sending') : t('auth.phone_login.use_otp')}
                    </Text>
                </Pressable>
            </View>

            <Pressable style={styles.switchBtn} onPress={handleSwitchAccount}>
                <Text style={styles.switchText}>{t('auth.phone_login.switch_account_full')}</Text>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.primary },
    back: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    backText: { color: Colors.text.secondary, fontSize: 16, fontWeight: '500' },
    content: {
        flex: 1, alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        gap: Spacing.sm,
    },
    iconWrap: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primaryTint,
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
    },
    iconEmoji: { fontSize: 36 },
    avatarWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    avatarText: { color: Colors.neutral.white, fontSize: 32, fontWeight: '800' },
    title:    { fontSize: 24, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
    subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center' },
    pinHint:  { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.xs },

    // Phone step
    inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', width: '100%' },
    flagBox: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: Spacing.md, paddingVertical: 14,
        borderWidth: 1, borderColor: Colors.border.medium,
        borderRadius: BorderRadius.lg, backgroundColor: Colors.background.secondary,
    },
    flag:     { fontSize: 18 },
    flagCode: { fontWeight: '600', color: Colors.text.primary },
    input: {
        flex: 1, borderWidth: 1, borderColor: Colors.border.medium,
        borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md,
        paddingVertical: 14, fontSize: 18, fontWeight: '600', letterSpacing: 1,
        backgroundColor: Colors.background.primary, color: Colors.text.primary,
    },
    cta: {
        backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 16, alignItems: 'center',
        marginTop: Spacing.md, width: '100%',
    },
    ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
    ctaText:     { color: Colors.neutral.white, fontWeight: '700', fontSize: 16 },

    // PIN step
    loadingWrap: {
        height: 216,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpLink: { marginTop: Spacing.lg, paddingVertical: Spacing.sm },
    otpLinkText: {
        color: Colors.brand.primary, fontWeight: '600', fontSize: 14, textAlign: 'center',
    },

    // Shared
    errorText: {
        fontSize: 13, color: Colors.semantic.error,
        fontWeight: '600', textAlign: 'center',
    },
    switchBtn: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.md,
    },
    switchText: { color: Colors.text.tertiary, fontSize: 14, fontWeight: '500' },
});