// app/(auth)/pin-setup.tsx
// Allows the user to create a 6-digit PIN after completing profile setup.
// PIN is used for faster sign-in on trusted devices (POST /auth/pin/verify).
// User may skip this step — they can set it later from Profile settings.

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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { usePinSetup } from '../../src/features/auth/hooks/usePinSetup';

const PIN_LENGTH = 6;

type Step = 'enter' | 'confirm';

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        return response?.data?.message ?? 'Could not save PIN. Please try again.';
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
    const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    return (
        <View style={padStyles.grid}>
            {keys.map((k, i) => {
                if (k === '') return <View key={i} style={padStyles.empty} />;
                const isDelete = k === '⌫';
                return (
                    <Pressable
                        key={i}
                        style={({ pressed }) => [padStyles.key, pressed && padStyles.keyPressed]}
                        onPress={() => isDelete ? onDelete() : onPress(k)}
                        accessibilityLabel={isDelete ? 'Delete' : k}
                    >
                        <Text style={[padStyles.keyText, isDelete && padStyles.deleteText]}>{k}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const padStyles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', width: 280, alignSelf: 'center' },
    empty: { width: 280 / 3, height: 72 },
    key: {
        width: 280 / 3, height: 72,
        alignItems: 'center', justifyContent: 'center',
        borderRadius: BorderRadius.lg,
    },
    keyPressed: { backgroundColor: Colors.background.tertiary },
    keyText: { fontSize: 26, fontWeight: '600', color: Colors.text.primary },
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
                    { newPin: pin, currentPin: null },
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
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={handleBack} disabled={isPending}>
                    <Text style={styles.backText}>← Back</Text>
                </Pressable>
                <Pressable style={styles.skipBtn} onPress={handleSkip} disabled={isPending}>
                    <Text style={styles.skipText}>{t('auth.pin_setup.skip')}</Text>
                </Pressable>
            </View>

            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconWrap}>
                    <Text style={styles.iconEmoji}>🔐</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>
                    {step === 'enter' ? t('auth.pin_setup.title') : t('auth.pin_setup.confirm_title')}
                </Text>
                <Text style={styles.subtitle}>
                    {step === 'enter' ? t('auth.pin_setup.subtitle') : t('auth.pin_setup.confirm_subtitle')}
                </Text>

                {/* Dots */}
                <View>
                    <PinDots filled={activePin.length} total={PIN_LENGTH} hasError={Boolean(hasError)} />
                </View>

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.primary },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    },
    backBtn: { paddingVertical: Spacing.sm },
    backText: { color: Colors.text.secondary, fontSize: 16, fontWeight: '500' },
    skipBtn: { paddingVertical: Spacing.sm, paddingLeft: Spacing.md },
    skipText: { color: Colors.brand.primary, fontSize: 15, fontWeight: '600' },
    content: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
    iconWrap: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primaryTint,
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
    },
    iconEmoji: { fontSize: 36 },
    title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
    subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.sm },
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