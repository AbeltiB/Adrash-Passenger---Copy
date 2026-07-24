// app/(auth)/otp.tsx
// OTP verification screen.
//
// Post-verification routing:
//   isNewUser || needsSetup  → /(auth)/setup        (profile setup for brand new accounts)
//   agreementRequired        → /(auth)/agreement    (terms changed, then go home)
//   returning                → /(tabs)              (straight home)
//
// PIN setup is optional and done from Profile → Security after login.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { useOtpSend } from '../../src/features/auth/hooks/useOtpSend';
import { useOtpVerify } from '../../src/features/auth/hooks/useOtpVerify';
import { isTestLoginNumber } from '../../src/features/auth/config';

const RESEND_SECONDS = 60;

function maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return phone;
    // Test/reviewer login IDs aren't real phone numbers — showing them
    // through the +251-masking below would just print a confusing string.
    if (isTestLoginNumber(phone)) return phone;
    const withoutCountry = phone.startsWith('+251') ? phone.slice(4) : phone;
    if (withoutCountry.length < 3) return phone;
    const last2 = withoutCountry.slice(-2);
    const masked = withoutCountry.slice(0, 1) + 'XX XXX X' + last2;
    return `+251 ${masked}`;
}

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string; errors?: { message: string }[] } } }).response;
        return response?.data?.message ?? response?.data?.errors?.[0]?.message ?? 'Verification failed. Please try again.';
    }
    if (error instanceof Error) return error.message;
    return 'Verification failed. Please try again.';
}

export default function OtpScreen() {
    const { t } = useTranslation();
    const { phone } = useLocalSearchParams<{ phone: string }>();
    const verifyOtp = useOtpVerify();
    const resendOtp = useOtpSend();

    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [verified, setVerified] = useState(false);
    const [seconds, setSeconds] = useState(RESEND_SECONDS);

    const inputRefs = useRef<(TextInput | null)[]>([]);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const verifying = verifyOtp.isPending;

    useEffect(() => {
        if (seconds <= 0) return;
        const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [seconds]);

    const shake = useCallback(() => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const verify = useCallback((codeDigits: string[]) => {
        const code = codeDigits.join('');
        if (code.length < 6 || verifying) return;
        if (!phone) {
            setError('Phone number is missing. Please go back and request a new code.');
            return;
        }

        setError('');
        verifyOtp.mutate(
            {
                phone,
                code,
                deviceLabel: 'Mobile App',
                deviceFingerprint: 'adrash-passenger-app',
                existingDeviceToken: null,
            },
            {
                onSuccess: (result) => {
                    setVerified(true);
                    setTimeout(() => {
                        if (result.isNewUser || result.needsSetup) {
                            // Brand new account → profile setup
                            router.replace('/(auth)/setup');
                        } else if (result.agreementRequired) {
                            // Terms changed after OTP — re-accept, then go home
                            router.replace({
                                pathname: '/(auth)/agreement',
                                params: { reaccept: '1', next: 'tabs' },
                            });
                        } else {
                            // Returning user — go straight home.
                            // PIN can be set up from Profile → Security if needed.
                            router.replace('/(tabs)');
                        }
                    }, 500);
                },
                onError: (err) => {
                    setError(getErrorMessage(err));
                    shake();
                    setDigits(['', '', '', '', '', '']);
                    setTimeout(() => inputRefs.current[0]?.focus(), 100);
                },
            },
        );
    }, [phone, shake, verifying, verifyOtp]);

    const handleDigit = (index: number, value: string) => {
        const stripped = value.replace(/\D/g, '');

        if (stripped.length >= 6) {
            const pasted = stripped.slice(0, 6).split('');
            setDigits(pasted);
            inputRefs.current[5]?.focus();
            verify(pasted);
            return;
        }

        const char = stripped.slice(-1);
        const next = [...digits];
        next[index] = char;
        setDigits(next);
        setError('');

        if (char && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
        if (char && index === 5) {
            verify(next);
        }
    };

    const handleKeyPress = (index: number, key: string) => {
        if (key === 'Backspace' && !digits[index] && index > 0) {
            const next = [...digits];
            next[index - 1] = '';
            setDigits(next);
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResend = () => {
        if (seconds > 0 || resendOtp.isPending || !phone) return;
        setDigits(['', '', '', '', '', '']);
        setError('');
        resendOtp.mutate(
            { phone },
            {
                onSuccess: () => {
                    setSeconds(RESEND_SECONDS);
                    inputRefs.current[0]?.focus();
                },
                onError: (err) => setError(getErrorMessage(err)),
            },
        );
    };

    const code = digits.join('');
    const allFilled = code.length === 6;
    const maskedPhone = maskPhone(phone ?? '');

    const boxStyle = (i: number) => [
        styles.box,
        digits[i] ? styles.boxFilled : null,
        error ? styles.boxError : null,
        verified ? styles.boxVerified : null,
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Pressable style={styles.back} onPress={() => router.back()} disabled={verifying}>
                <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <View style={styles.content}>
                <Text style={styles.title}>{t('auth.otp.title')}</Text>

                <Pressable onPress={() => router.back()} disabled={verifying}>
                    <Text style={styles.subtitle}>
                        {t('auth.otp.subtitle', { phone: maskedPhone })}
                        {'\n'}
                        <Text style={styles.tapChange}>{t('auth.otp.tap_change')}</Text>
                    </Text>
                </Pressable>

                <Animated.View style={[styles.boxes, { transform: [{ translateX: shakeAnim }] }]}>
                    {digits.map((d, i) => (
                        <TextInput
                            key={i}
                            ref={(r) => { inputRefs.current[i] = r; }}
                            style={boxStyle(i)}
                            value={d}
                            onChangeText={(v) => handleDigit(i, v)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                            keyboardType="number-pad"
                            maxLength={6}
                            selectTextOnFocus
                            editable={!verifying && !verified}
                            textContentType="oneTimeCode"
                            autoComplete="sms-otp"
                        />
                    ))}
                </Animated.View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {verified ? <Text style={styles.successText}>{t('auth.otp.verified')}</Text> : null}

                <Pressable
                    style={[styles.cta, (!allFilled || verifying || verified) && styles.ctaDisabled]}
                    onPress={() => verify(digits)}
                    disabled={!allFilled || verifying || verified}
                >
                    <Text style={styles.ctaText}>
                        {verifying ? t('auth.otp.verifying') : verified ? t('auth.otp.verify') : t('auth.otp.verify')}
                    </Text>
                </Pressable>

                <View style={styles.resendRow}>
                    {seconds > 0 ? (
                        <Text style={styles.timer}>{t('auth.otp.resend_in', { seconds: String(seconds).padStart(2, '0') })}</Text>
                    ) : (
                        <Pressable onPress={handleResend} disabled={resendOtp.isPending}>
                            <Text style={styles.resend}>{resendOtp.isPending ? t('common.sending') : t('auth.otp.resend')}</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.primary, padding: Spacing.xl },
    back: { paddingVertical: Spacing.sm },
    backText: { color: Colors.text.secondary, fontSize: 16, fontWeight: '500' },
    content: { flex: 1, justifyContent: 'center', gap: Spacing.md },
    title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
    subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 22 },
    phoneHighlight: { color: Colors.text.primary, fontWeight: '700' },
    tapChange: { color: Colors.brand.primary, fontSize: 12, fontWeight: '600' },
    boxes: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Spacing.md },
    box: {
        width: 48, height: 56, borderRadius: BorderRadius.lg, borderWidth: 1.5,
        borderColor: Colors.border.medium, textAlign: 'center', fontSize: 22,
        fontWeight: '700', color: Colors.text.primary, backgroundColor: Colors.background.secondary,
    },
    boxFilled:   { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primaryTint },
    boxError:    { borderColor: Colors.semantic.error, backgroundColor: Colors.semantic.errorLight },
    boxVerified: { borderColor: Colors.semantic.success, backgroundColor: Colors.semantic.successLight },
    errorText:   { color: Colors.semantic.error, fontSize: 13, textAlign: 'center', fontWeight: '600' },
    successText: { color: Colors.semantic.success, fontSize: 14, textAlign: 'center', fontWeight: '700' },
    cta: {
        backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm,
    },
    ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    resendRow: { alignItems: 'center', marginTop: Spacing.sm },
    timer:  { color: Colors.text.tertiary, fontSize: 14 },
    resend: { color: Colors.brand.primary, fontWeight: '700', fontSize: 14 },
});