// app/(auth)/pin-login.tsx
// Shown to returning users whose access token has expired but who have
// a device token stored. They enter their 6-digit PIN directly —
// no phone number entry needed since we already know who they are.
//
// Success flow:
//   agreementRequired → /(auth)/agreement?reaccept=1 → PIN already done → /(tabs)
//   no agreement issue → /(tabs)

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { usePinVerify } from '../../src/features/auth/hooks/usePinVerify';
import {
    getDeviceToken,
    clearAllSecureData,
} from '../../src/features/auth/utils/token';

const PIN_LENGTH = 6;

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
        const res = (error as { response?: { data?: { message?: string } } }).response;
        return res?.data?.message ?? 'Incorrect PIN. Please try again.';
    }
    if (error instanceof Error) return error.message;
    return 'Incorrect PIN. Please try again.';
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
        borderWidth: 2, borderColor: Colors.border.medium,
        backgroundColor: 'transparent',
    },
    dotFilled: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
    dotError:  { backgroundColor: Colors.semantic.error, borderColor: Colors.semantic.error },
});

// ─── Numpad ───────────────────────────────────────────────────────────────────

function NumPad({ onPress, onDelete, disabled }: {
    onPress: (n: string) => void;
    onDelete: () => void;
    disabled: boolean;
}) {
    const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    return (
        <View style={padStyles.grid}>
            {keys.map((k, i) => {
                if (k === '') return <View key={i} style={padStyles.empty} />;
                const isDelete = k === '⌫';
                return (
                    <Pressable
                        key={i}
                        style={({ pressed }) => [
                            padStyles.key,
                            pressed && !disabled && padStyles.keyPressed,
                            disabled && padStyles.keyDisabled,
                        ]}
                        onPress={() => !disabled && (isDelete ? onDelete() : onPress(k))}
                        accessibilityLabel={isDelete ? 'Delete' : k}
                    >
                        <Text style={[padStyles.keyText, isDelete && padStyles.deleteText]}>
                            {k}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const padStyles = StyleSheet.create({
    grid:        { flexDirection: 'row', flexWrap: 'wrap', width: 280, alignSelf: 'center' },
    empty:       { width: 280 / 3, height: 72 },
    key:         { width: 280 / 3, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.lg },
    keyPressed:  { backgroundColor: Colors.background.tertiary },
    keyDisabled: { opacity: 0.4 },
    keyText:     { fontSize: 26, fontWeight: '600', color: Colors.text.primary },
    deleteText:  { fontSize: 22 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PinLoginScreen() {
    const [pin, setPin]           = useState('');
    const [hasError, setHasError] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const shakeAnim               = useRef(new Animated.Value(0)).current;

    const user      = useAuthStore((s) => s.user);
    const logout    = useAuthStore((s) => s.logout);

    const { mutate: verifyPin, isPending } = usePinVerify();

    const displayName = user?.firstName
        ? `Welcome back, ${user.firstName}`
        : 'Welcome back';

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

    const submitPin = useCallback(async (fullPin: string) => {
        const deviceToken = await getDeviceToken();
        if (!deviceToken || !user?.phoneNumber) {
            // No device token or phone on record — fall back to full OTP flow
            router.replace('/(auth)');
            return;
        }

        verifyPin(
            { phone: user.phoneNumber, pin: fullPin, deviceToken },
            {
                onSuccess: (result) => {
                    if (result.agreementRequired) {
                        // New agreement — go accept it, then come back to home
                        // We pass 'reaccept=1' so the agreement screen knows
                        // NOT to redirect to PIN setup (PIN is already set up)
                        router.replace({
                            pathname: '/(auth)/agreement',
                            params: { reaccept: '1' },
                        });
                    } else {
                        router.replace('/(tabs)');
                    }
                },
                onError: (err) => {
                    const next = attempts + 1;
                    setAttempts(next);
                    setHasError(true);
                    shake();
                    setPin('');
                    setTimeout(() => setHasError(false), 800);
                    // After 5 failed attempts, fall back to OTP for security
                    if (next >= 5) {
                        router.replace('/(auth)/phone');
                    }
                },
            },
        );
    }, [user, verifyPin, attempts, shake]);

    const handlePress = useCallback((n: string) => {
        if (isPending) return;
        const next = pin + n;
        if (next.length > PIN_LENGTH) return;
        setPin(next);
        setHasError(false);

        if (next.length === PIN_LENGTH) {
            submitPin(next);
        }
    }, [pin, isPending, submitPin]);

    const handleDelete = useCallback(() => {
        if (isPending) return;
        setPin((p) => p.slice(0, -1));
        setHasError(false);
    }, [isPending]);

    // If user somehow lands here without a device token, redirect immediately
    useEffect(() => {
        getDeviceToken().then((dt) => {
            if (!dt) router.replace('/(auth)');
        });
    }, []);

    const handleSignInDifferently = useCallback(async () => {
        await clearAllSecureData();
        logout();
        router.replace('/(auth)');
    }, [logout]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.content}>
                {/* Avatar / greeting */}
                <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>
                        {user?.firstName?.[0]?.toUpperCase() ?? '👤'}
                    </Text>
                </View>
                <Text style={styles.greeting}>{displayName}</Text>
                <Text style={styles.subtitle}>Enter your PIN to continue</Text>

                {/* PIN dots */}
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <PinDots filled={pin.length} hasError={hasError} />
                </Animated.View>

                {/* Attempt warning */}
                {attempts > 0 && attempts < 5 && (
                    <Text style={styles.attemptsText}>
                        {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining
                    </Text>
                )}

                {/* Spinner while verifying */}
                {isPending ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={Colors.brand.primary} />
                    </View>
                ) : (
                    <NumPad
                        onPress={handlePress}
                        onDelete={handleDelete}
                        disabled={isPending}
                    />
                )}
            </View>

            {/* Sign in differently link */}
            <Pressable style={styles.switchBtn} onPress={handleSignInDifferently}>
                <Text style={styles.switchText}>Sign in with a different account</Text>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.primary },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    avatarWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    avatarText: {
        color: Colors.neutral.white,
        fontSize: 32,
        fontWeight: '800',
    },
    greeting: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text.primary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: Colors.text.tertiary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    attemptsText: {
        fontSize: 13,
        color: Colors.semantic.error,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    loadingWrap: {
        height: 216, // same height as the numpad so layout doesn't jump
        alignItems: 'center',
        justifyContent: 'center',
    },
    switchBtn: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.md,
    },
    switchText: {
        color: Colors.text.tertiary,
        fontSize: 14,
        fontWeight: '500',
    },
});
