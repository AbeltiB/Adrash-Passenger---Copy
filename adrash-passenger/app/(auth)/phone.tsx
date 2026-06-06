// app/(auth)/phone.tsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { useOtpSend } from '../../src/features/auth/hooks/useOtpSend';
import {
  formatLocalPhone,
  isValidLocalPhone,
  networkLabel,
  sanitizeLocalPhone,
  toE164,
} from '../../src/lib/phone';

/**
 * +251 is prefilled; the user enters only the 9-digit local number starting
 * with 9 (Ethio Telecom) or 7 (Safaricom). A leading 0 is stripped on input,
 * and the number is normalised to +2519XXXXXXXX / +2517XXXXXXXX for the API.
 */

export function normaliseEthiopianPhone(raw: string): string {
  return toE164(raw);
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; errors?: { message: string }[] } } }).response;
    return response?.data?.message ?? response?.data?.errors?.[0]?.message ?? 'Unable to send verification code.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to send verification code.';
}

export default function PhoneScreen() {
  const { t } = useTranslation();
  const [raw, setRaw] = useState('');
  const sendOtp = useOtpSend();
  const valid = isValidLocalPhone(raw);

  const handleChange = (text: string) => {
    setRaw(sanitizeLocalPhone(text));
  };

  const handleContinue = () => {
    if (!valid || sendOtp.isPending) return;
    const normalised = normaliseEthiopianPhone(raw);

    // API expects { phone } in E.164 format
    sendOtp.mutate(
      { phone: normalised },
      {
        onSuccess: () => {
          router.push({ pathname: '/(auth)/otp', params: { phone: normalised } });
        },
      },
    );
  };

  const networkHint = networkLabel(raw);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.illust}>
          <Text style={styles.illustEmoji}>📱</Text>
        </View>
        <Text style={styles.title}>{t('auth.phone.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.phone.subtitle')}</Text>

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
            value={formatLocalPhone(raw)}
            onChangeText={handleChange}
            maxLength={11}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            editable={!sendOtp.isPending}
          />
        </View>

        {networkHint && (
          <Text style={styles.networkHint}>📶 {networkHint}</Text>
        )}

        {raw.length > 0 && !valid && (
          <Text style={styles.error}>{t('auth.phone.invalid_phone')}</Text>
        )}

        {sendOtp.error ? <Text style={styles.error}>{getErrorMessage(sendOtp.error)}</Text> : null}

        <Pressable
          style={[styles.cta, (!valid || sendOtp.isPending) && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!valid || sendOtp.isPending}
        >
          <Text style={styles.ctaText}>{sendOtp.isPending ? t('auth.phone.sending') : t('auth.phone.send_otp')}</Text>
        </Pressable>

        <Pressable
          style={styles.poweredBy}
          onPress={() => Linking.openURL('https://bstechnologiesplc.com')}
        >
          <Text style={styles.poweredByText}>
            Powered by <Text style={styles.poweredByLink}>BS Technologies</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Spacing.xl,
  },
  back: { paddingVertical: Spacing.sm },
  backText: { color: Colors.text.secondary, fontSize: 16, fontWeight: '500' },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.sm },
  illust: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primaryTint,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  illustEmoji: { fontSize: 36 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', marginBottom: Spacing.lg },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  flagBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border.medium,
    borderRadius: BorderRadius.lg, backgroundColor: Colors.background.secondary,
  },
  flag: { fontSize: 18 },
  flagCode: { fontWeight: '600', color: Colors.text.primary },
  input: {
    flex: 1, borderWidth: 1, borderColor: Colors.border.medium,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md,
    paddingVertical: 14, fontSize: 18, fontWeight: '600', letterSpacing: 1,
    backgroundColor: Colors.background.primary, color: Colors.text.primary,
  },
  networkHint: { color: Colors.brand.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  error: { color: Colors.semantic.error, fontSize: 13, marginTop: 2 },
  cta: {
    backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md,
  },
  ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  poweredBy: { alignItems: 'center', marginTop: Spacing.md },
  poweredByText: { textAlign: 'center', color: Colors.text.tertiary, fontSize: 12 },
  poweredByLink: { color: Colors.brand.primary, fontWeight: '600' },
});