// app/(auth)/setup.tsx
// One-time profile setup for new users after OTP verification.
// On success → routes to PIN setup screen.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import { apiClient } from '../../src/api/client';
import { ENDPOINTS } from '../../src/api/endpoints';
import { storeTokens } from '../../src/features/auth/utils/token';
import type { ApiResponse, SetupProfileResponse, SetupProfileCommand } from '../../src/api/types';

export default function SetupScreen() {
    const { t } = useTranslation();
    const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
    const setUser = useAuthStore((s) => s.setUser);

    const [first, setFirst] = useState('');
    const [last, setLast] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const valid = first.trim().length >= 2 && last.trim().length >= 2;

    async function finish() {
        if (!valid || loading) return;
        setLoading(true);
        setError(null);

        try {
            const body: SetupProfileCommand = {
                firstName: first.trim(),
                lastName: last.trim(),
                role: 'Passenger',
            };

            const res = await apiClient.patch<ApiResponse<SetupProfileResponse>>(
                ENDPOINTS.AUTH.SETUP_PROFILE,
                body,
            );

            if (!res.data.success || !res.data.data) {
                throw new Error(res.data.errors?.[0] ?? 'Setup failed');
            }

            const { user, tokens, agreementRequired } = res.data.data;

            if (tokens) {
                await storeTokens({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresIn: tokens.expiresIn,
                });
            }

            setUser({
                id: user.id,
                firstName: first.trim(),
                lastName: last.trim(),
                phoneNumber: user.phone ?? '',
                createdAt: new Date().toISOString(),
            });
            setAuthenticated(true);

            if (agreementRequired) {
                router.replace({
                    pathname: '/(auth)/agreement',
                    params: { reaccept: '1', next: 'pin-setup' },
                });
            } else {
                router.replace('/(auth)/pin-setup');
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.content}>
                <View style={styles.illust}>
                    <Text style={styles.illustEmoji}>👋</Text>
                </View>
                <Text style={styles.title}>{t('auth.setup.title')}</Text>
                <Text style={styles.subtitle}>{t('auth.setup.subtitle')}</Text>

                <Text style={styles.label}>{t('auth.setup.first_name_label')}</Text>
                <TextInput
                    style={styles.input}
                    placeholder={t('auth.setup.first_name_placeholder')}
                    placeholderTextColor={Colors.text.disabled}
                    value={first}
                    onChangeText={setFirst}
                    autoCapitalize="words"
                    returnKeyType="next"
                    editable={!loading}
                />

                <Text style={styles.label}>{t('auth.setup.last_name_label')}</Text>
                <TextInput
                    style={styles.input}
                    placeholder={t('auth.setup.last_name_placeholder')}
                    placeholderTextColor={Colors.text.disabled}
                    value={last}
                    onChangeText={setLast}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={finish}
                    editable={!loading}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                    style={[styles.cta, (!valid || loading) && styles.ctaDisabled]}
                    onPress={finish}
                    disabled={!valid || loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.neutral.white} />
                    ) : (
                        <Text style={styles.ctaText}>{t('auth.setup.continue')}</Text>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.primary, padding: Spacing.xl },
    content: { flex: 1, justifyContent: 'center', gap: Spacing.sm },
    illust: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primaryTint,
        alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center', marginBottom: Spacing.md,
    },
    illustEmoji: { fontSize: 36 },
    title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
    subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', marginBottom: Spacing.lg },
    label: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600', marginTop: Spacing.sm },
    input: {
        borderWidth: 1, borderColor: Colors.border.medium, borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: 16,
        backgroundColor: Colors.background.primary, color: Colors.text.primary,
    },
    error: { color: Colors.semantic.error, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    cta: {
        backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 16, alignItems: 'center', marginTop: Spacing.xl,
    },
    ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
    ctaText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 16 },
});