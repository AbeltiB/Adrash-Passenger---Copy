// app/(auth)/pin-setup.tsx
// Create a 6-digit PIN after the first login (profile setup for new users, or
// OTP on a new device for returning users). PIN is used for faster sign-in on
// trusted devices (POST /auth/pin/verify). Shown on first login but skippable —
// users can also set it later from Profile → Security.

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { AuthHero } from '../../src/features/auth/components/AuthHero';
import { usePinSetup } from '../../src/features/auth/hooks/usePinSetup';

const PIN_LENGTH = 6;

type Step = 'enter' | 'confirm';

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
        const data = (error as { response?: { data?: unknown } }).response?.data as
            | {
                  message?: string;
                  title?: string;
                  detail?: string;
                  // App envelope: errors as a string[]; ASP.NET ValidationProblemDetails: { field: string[] }
                  errors?: string[] | Record<string, string[]>;
              }
            | undefined;
        if (data) {
            if (Array.isArray(data.errors) && typeof data.errors[0] === 'string') return data.errors[0];
            if (data.errors && typeof data.errors === 'object') {
                const first = Object.values(data.errors).flat()[0];
                if (typeof first === 'string') return first;
            }
            if (data.message) return data.message;
            if (data.detail) return data.detail;
            if (data.title) return data.title;
        }
    }
    if (error instanceof Error) return error.message;
    return 'Could not save PIN. Please try again.';
}

// ─── PIN dot display ──────────────────────────────────────────────────────────

function PinDots({ filled, total, hasError }: { filled: number; total: number; hasError: boolean }) {
    return (
        <View style={dotStyles.row}>
            {Array.from({ length: total }).map((_, i) => (
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
        borderWidth: 2, borderColor: Colors.border.medium,
        backgroundColor: 'transparent',
    },
    dotFilled: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
    dotError: { backgroundColor: Colors.semantic.error, borderColor: Colors.semantic.error },
});

// ─── Numpad ───────────────────────────────────────────────────────────────────

function NumPad({ onPress, onDelete }: { onPress: (n: string) => void; onDelete: () => void }) {
    const rows: string[][] = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];
    return (
        <View style={padStyles.grid}>
            {rows.map((row, ri) => (
                <View key={ri} style={padStyles.row}>
                    {row.map((k, ki) => {
                        if (k === '') return <View key={ki} style={padStyles.empty} />;
                        const isDelete = k === '⌫';
                        return (
                            <Pressable
                                key={ki}
                                style={({ pressed }) => [padStyles.key, pressed && padStyles.keyPressed]}
                                onPress={() => isDelete ? onDelete() : onPress(k)}
                                accessibilityLabel={isDelete ? 'Delete' : k}
                            >
                                <Text style={[padStyles.keyText, isDelete && padStyles.deleteText]}>{k}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

const padStyles = StyleSheet.create({
    grid:       { alignSelf: 'center', width: 300 },
    row:        { flexDirection: 'row' },
    empty:      { flex: 1, height: 72 },
    key:        { flex: 1, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.lg },
    keyPressed: { backgroundColor: Colors.background.tertiary },
    keyText:    { fontSize: 26, fontWeight: '600', color: Colors.text.primary },
    deleteText: { fontSize: 22 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PinSetupScreen() {
    const { t } = useTranslation();
    const [step, setStep] = useState<Step>('enter');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [mismatch, setMismatch] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const { mutate: setupPin, isPending, error: apiError } = usePinSetup();

    const shake = useCallback(() => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const activePin = step === 'enter' ? pin : confirmPin;
    const setActive = step === 'enter' ? setPin : setConfirmPin;

    const handlePress = useCallback((n: string) => {
        if (activePin.length >= PIN_LENGTH || isPending) return;
        const next = activePin + n;
        setActive(next);
        setMismatch(false);

        if (next.length === PIN_LENGTH) {
            if (step === 'enter') {
                // Move to confirmation step
                setTimeout(() => setStep('confirm'), 150);
            } else {
                // Confirm step filled — check match
                if (next !== pin) {
                    shake();
                    setMismatch(true);
                    setTimeout(() => {
                        setConfirmPin('');
                        setMismatch(false);
                    }, 800);
                    return;
                }
                // PINs match — save
                setupPin(
                    { newPin: pin },
                    {
                        onSuccess: () => router.replace('/(tabs)'),
                    },
                );
            }
        }
    }, [activePin, isPending, step, pin, setActive, shake, setupPin]);

    const handleDelete = useCallback(() => {
        if (isPending) return;
        setActive((prev) => prev.slice(0, -1));
        setMismatch(false);
    }, [isPending, setActive]);

    const handleSkip = () => router.replace('/(tabs)');

    const handleBack = () => {
        if (step === 'confirm') {
            setStep('enter');
            setConfirmPin('');
            setMismatch(false);
        } else {
            router.back();
        }
    };

    const hasError = mismatch || !!apiError;

    return (
        <AuthHero
            title={step === 'enter' ? t('auth.pin_setup.title') : t('auth.pin_setup.confirm_title')}
            subtitle={step === 'enter' ? t('auth.pin_setup.subtitle') : t('auth.pin_setup.confirm_subtitle')}
            showBack
            onBack={handleBack}
            headerRight={
                <Pressable onPress={handleSkip} disabled={isPending} hitSlop={10} style={styles.skipBtn}>
                    <Text style={styles.skipText}>{t('auth.pin_setup.skip')}</Text>
                </Pressable>
            }
        >
            <View style={styles.center}>
                {/* Dots */}
                <PinDots filled={activePin.length} total={PIN_LENGTH} hasError={Boolean(hasError)} />

                {/* Error messages */}
                {mismatch && (
                    <Text style={styles.errorText}>{t('auth.pin_setup.mismatch')}</Text>
                )}
                {Boolean(apiError) && !mismatch && (
                    <Text style={styles.errorText}>{getErrorMessage(apiError)}</Text>
                )}

                {/* Step indicator */}
                <View style={styles.stepRow}>
                    <View style={[styles.stepDot, styles.stepDotActive]} />
                    <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
                </View>

                {/* Numpad or spinner */}
                {isPending ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={Colors.brand.primary} />
                        <Text style={styles.loadingText}>{t('auth.pin_setup.saving')}</Text>
                    </View>
                ) : (
                    <NumPad onPress={handlePress} onDelete={handleDelete} />
                )}

                <Text style={styles.hint}>{t('auth.pin_setup.hint')}</Text>
            </View>
        </AuthHero>
    );
}

const styles = StyleSheet.create({
    center: { alignItems: 'center' },
    skipBtn: {
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.full,
        paddingHorizontal: 18,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipText: { color: Colors.brand.primary, fontSize: 15, fontWeight: '800' },
    errorText: { color: Colors.semantic.error, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    stepRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
    stepDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: Colors.border.medium,
    },
    stepDotActive: { backgroundColor: Colors.brand.primary },
    loadingWrap: { alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl },
    loadingText: { color: Colors.text.tertiary, fontSize: 14 },
    hint: {
        fontSize: 12, color: Colors.text.tertiary, textAlign: 'center',
        marginTop: Spacing.xl, paddingHorizontal: Spacing.md,
    },
});