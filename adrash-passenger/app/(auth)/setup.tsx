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
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { AuthHero } from '../../src/features/auth/components/AuthHero';
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
        <AuthHero title={t('auth.setup.title')} subtitle={t('auth.setup.subtitle')}>
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
                autoFocus
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
        </AuthHero>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 12, color: Colors.text.tertiary, fontWeight: '700', letterSpacing: 0.4, marginTop: Spacing.xs },
    input: {
        borderWidth: 1.5, borderColor: Colors.border.medium, borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: 16,
        backgroundColor: Colors.background.secondary, color: Colors.text.primary,
    },
    error: { color: Colors.semantic.error, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    cta: {
        backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg,
    },
    ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
    ctaText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 16 },
});