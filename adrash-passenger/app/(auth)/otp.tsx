import { useEffect, useRef, useState, useCallback } from 'react';
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

// ─── Constants ────────────────────────────────────────────────────────────────

/** Demo: only this code passes. Replace with real API call. */
const DEMO_VALID_CODE = '123456';

/** Countdown in seconds before Resend becomes active */
const RESEND_SECONDS = 60;

/**
 * Simulated SMS autofill delay (ms).
 * In production replace this with expo-sms-retriever or the Android SMS
 * User Consent API. iOS uses the `textContentType="oneTimeCode"` prop on
 * the hidden TextInput which triggers the system SMS autofill banner.
 */
const SMS_AUTOFILL_DELAY_MS = 3000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Masks a +251XXXXXXXXX number so only the last 2 digits are visible.
 * e.g. "+251912345678" → "+251 9XX XXX X78"
 */
function maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return phone;

    // Normalised format coming from phone.tsx: +251XXXXXXXXX (12 chars total)
    // Strip leading +251, work with the 9-digit local part
    const withoutCountry = phone.startsWith('+251') ? phone.slice(4) : phone;
    // withoutCountry is e.g. "912345678" (9 digits)
    if (withoutCountry.length < 3) return phone;

    const last2 = withoutCountry.slice(-2);
    const masked = withoutCountry.slice(0, 1) + 'XX XXX X' + last2;
    return `+251 ${masked}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OtpScreen() {
    const { phone } = useLocalSearchParams<{ phone: string }>();

    // Six individual digit values
    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);

    // UI state
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [seconds, setSeconds] = useState(RESEND_SECONDS);
    const [smsHint, setSmsHint] = useState('');   // shows "SMS autofill detected…"

    // Refs
    const inputRefs = useRef<(TextInput | null)[]>([]);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // ── Countdown timer ──────────────────────────────────────────────────────
    useEffect(() => {
        if (seconds <= 0) return;
        const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [seconds]);

    // ── Simulated SMS autofill ───────────────────────────────────────────────
    // In production: use expo-sms-retriever (Android) or textContentType="oneTimeCode" (iOS).
    // Here we simulate the OS delivering the OTP after a short delay.
    useEffect(() => {
        const timer = setTimeout(() => {
            setSmsHint('📩 SMS received — filling code automatically…');
            // Fill all 6 boxes with the demo code
            const autoCode = DEMO_VALID_CODE.split('');
            setDigits(autoCode);
            // Trigger verification after a brief visual pause so the user sees it fill
            setTimeout(() => {
                setSmsHint('');
                verify(autoCode);
            }, 600);
        }, SMS_AUTOFILL_DELAY_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Shake animation on wrong code ────────────────────────────────────────
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

    // ── Core verify logic ────────────────────────────────────────────────────
    const verify = useCallback((codeDigits: string[]) => {
        const code = codeDigits.join('');
        if (code.length < 6) return;

        setVerifying(true);
        setError('');

        // Simulate network round-trip (replace with real API call via useOtpVerify)
        setTimeout(() => {
            setVerifying(false);
            if (code === DEMO_VALID_CODE) {
                setVerified(true);
                // Short success pause then navigate
                setTimeout(() => {
                    // In production check isNewUser from API response:
                    //   isNewUser ? router.replace('/(auth)/setup') : router.replace('/(tabs)')
                    router.replace('/(auth)/setup');
                }, 700);
            } else {
                setError('Incorrect code. Please try again.');
                shake();
                // Clear boxes so user can re-enter
                setDigits(['', '', '', '', '', '']);
                setTimeout(() => inputRefs.current[0]?.focus(), 100);
            }
        }, 800);
    }, [shake]);

    // ── Handle single-digit input ────────────────────────────────────────────
    const handleDigit = (index: number, value: string) => {
        // Allow paste of full 6-digit code in any box
        const stripped = value.replace(/\D/g, '');

        if (stripped.length >= 6) {
            const pasted = stripped.slice(0, 6).split('');
            setDigits(pasted);
            inputRefs.current[5]?.focus();
            verify(pasted);
            return;
        }

        const char = stripped.slice(-1); // take last digit typed
        const next = [...digits];
        next[index] = char;
        setDigits(next);
        setError('');

        if (char && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-verify when last box is filled
        if (char && index === 5) {
            verify(next);
        }
    };

    // Backspace: clear current box and move focus back
    const handleKeyPress = (index: number, key: string) => {
        if (key === 'Backspace' && !digits[index] && index > 0) {
            const next = [...digits];
            next[index - 1] = '';
            setDigits(next);
            inputRefs.current[index - 1]?.focus();
        }
    };

    // ── Resend ───────────────────────────────────────────────────────────────
    const handleResend = () => {
        if (seconds > 0) return;
        setDigits(['', '', '', '', '', '']);
        setError('');
        setSeconds(RESEND_SECONDS);
        setSmsHint('');
        inputRefs.current[0]?.focus();
        // TODO: call POST /auth/otp/send again via useOtpSend hook
    };

    // ── Derived ──────────────────────────────────────────────────────────────
    const code = digits.join('');
    const allFilled = code.length === 6;
    const maskedPhone = maskPhone(phone ?? '');

    // ── Box border colour ────────────────────────────────────────────────────
    const boxStyle = (i: number) => [
        styles.box,
        digits[i] ? styles.boxFilled : null,
        error ? styles.boxError : null,
        verified ? styles.boxVerified : null,
    ];

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Pressable style={styles.back} onPress={() => router.back()}>
                <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <View style={styles.content}>
                {/* Header */}
                <Text style={styles.title}>Enter verification code</Text>

                {/* Phone display — tap to change */}
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit code to{' '}
                        <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
                        {'\n'}
                        <Text style={styles.tapChange}>(tap to change number)</Text>
                    </Text>
                </Pressable>

                {/* SMS autofill hint */}
                {smsHint ? (
                    <Text style={styles.smsHint}>{smsHint}</Text>
                ) : null}

                {/* OTP boxes */}
                <Animated.View
                    style={[styles.boxes, { transform: [{ translateX: shakeAnim }] }]}
                >
                    {digits.map((d, i) => (
                        <TextInput
                            key={i}
                            ref={(r) => { inputRefs.current[i] = r; }}
                            style={boxStyle(i)}
                            value={d}
                            onChangeText={(v) => handleDigit(i, v)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                            keyboardType="number-pad"
                            maxLength={6} // allow full paste in any box
                            selectTextOnFocus
                            editable={!verifying && !verified}
                            // iOS SMS autofill — system will suggest the OTP from SMS
                            textContentType="oneTimeCode"
                            autoComplete="sms-otp"
                        />
                    ))}
                </Animated.View>

                {/* Error message */}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Verified success */}
                {verified ? (
                    <Text style={styles.successText}>✓ Verified! Redirecting…</Text>
                ) : null}

                {/* Verify button (manual fallback) */}
                <Pressable
                    style={[
                        styles.cta,
                        (!allFilled || verifying || verified) && styles.ctaDisabled,
                    ]}
                    onPress={() => verify(digits)}
                    disabled={!allFilled || verifying || verified}
                >
                    <Text style={styles.ctaText}>
                        {verifying ? 'Verifying…' : verified ? '✓ Verified' : 'Verify'}
                    </Text>
                </Pressable>

                {/* Resend */}
                <View style={styles.resendRow}>
                    {seconds > 0 ? (
                        <Text style={styles.timer}>
                            Resend code in 0:{String(seconds).padStart(2, '0')}
                        </Text>
                    ) : (
                        <Pressable onPress={handleResend}>
                            <Text style={styles.resend}>Resend code</Text>
                        </Pressable>
                    )}
                </View>

                {/* Demo notice — remove in production */}
                <View style={styles.demoNotice}>
                    <Text style={styles.demoText}>
                        🧪 Demo mode — code <Text style={styles.demoCode}>123456</Text> will
                        auto-fill via simulated SMS in {SMS_AUTOFILL_DELAY_MS / 1000}s
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.primary,
        padding: Spacing.xl,
    },
    back: { paddingVertical: Spacing.sm },
    backText: { color: Colors.text.secondary, fontSize: 16, fontWeight: '500' },

    content: { flex: 1, justifyContent: 'center', gap: Spacing.md },

    title: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.text.primary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center',
        lineHeight: 22,
    },
    phoneHighlight: {
        color: Colors.text.primary,
        fontWeight: '700',
    },
    tapChange: {
        color: Colors.brand.primary,
        fontSize: 12,
        fontWeight: '600',
    },

    smsHint: {
        color: Colors.brand.primary,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },

    boxes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: Spacing.md,
    },
    box: {
        width: 48,
        height: 56,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.border.medium,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text.primary,
        backgroundColor: Colors.background.secondary,
    },
    boxFilled: {
        borderColor: Colors.brand.primary,
        backgroundColor: '#F1FAF4',
    },
    boxError: {
        borderColor: Colors.semantic.error,
        backgroundColor: Colors.semantic.errorLight,
    },
    boxVerified: {
        borderColor: Colors.semantic.success,
        backgroundColor: Colors.semantic.successLight,
    },

    errorText: {
        color: Colors.semantic.error,
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '600',
    },
    successText: {
        color: Colors.semantic.success,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '700',
    },

    cta: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    resendRow: { alignItems: 'center', marginTop: Spacing.sm },
    timer: { color: Colors.text.tertiary, fontSize: 14 },
    resend: { color: Colors.brand.primary, fontWeight: '700', fontSize: 14 },

    demoNotice: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.semantic.warningLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    demoText: {
        color: Colors.semantic.warning,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    demoCode: { fontWeight: '800', fontFamily: 'monospace' },
});