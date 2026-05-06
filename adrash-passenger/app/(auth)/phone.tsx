// app/(auth)/phone.tsx

import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';

/**
 * Accepted formats:
 *   09XXXXXXXX  (10 digits, EthioTelecom)
 *   9XXXXXXXX   (9 digits,  EthioTelecom)
 *   07XXXXXXXX  (10 digits, Safaricom)
 *   7XXXXXXXX   (9 digits,  Safaricom)
 *
 * All normalised to +2519XXXXXXXX or +2517XXXXXXXX before API call.
 */

const ETHIOPIAN_PHONE_RE = /^(09|9|07|7)\d{8}$/;

/** Returns the 9-digit local part (without leading 0) */
function stripLeadingZero(raw: string): string {
  return raw.startsWith('0') ? raw.slice(1) : raw;
}

/** Formats the raw input for display — inserts a space after position 4 */
function displayFormat(raw: string): string {
  // Remove everything but digits
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

/** Converts any accepted format to +251XXXXXXXXX */
export function normaliseEthiopianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, ''); // strip spaces added by displayFormat
  const local = stripLeadingZero(digits); // 9 digits: 9XXXXXXXX or 7XXXXXXXX
  return `+251${local}`;
}

/** Returns true for all 4 accepted formats */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return ETHIOPIAN_PHONE_RE.test(digits);
}

export default function PhoneScreen() {
  // raw stores only digits (no spaces) so validation stays clean
  const [raw, setRaw] = useState('');
  const valid = isValidPhone(raw);

  // Keeps at most 10 digits (09XXXXXXXX is the longest accepted form)
  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setRaw(digits);
  };

  const handleContinue = () => {
    if (!valid) return;
    const normalised = normaliseEthiopianPhone(raw);
    // Pass the normalised number as a param so the OTP screen can display it
    router.push({ pathname: '/(auth)/otp', params: { phone: normalised } });
  };

  // Derive what network prefix this is (for UX hint only)
  const networkHint = (() => {
    const d = raw.replace(/\D/g, '');
    if (d.startsWith('09') || d.startsWith('9')) return 'Ethio Telecom';
    if (d.startsWith('07') || d.startsWith('7')) return 'Safaricom ET';
    return null;
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.illust}>
          <Text style={styles.illustEmoji}>📱</Text>
        </View>
        <Text style={styles.title}>Enter your phone number</Text>
        <Text style={styles.subtitle}>
          We&apos;ll send you a 6-digit verification code by SMS
        </Text>

        {/* Input row */}
        <View style={styles.inputRow}>
          <View style={styles.flagBox}>
            <Text style={styles.flag}>🇪🇹</Text>
            <Text style={styles.flagCode}>+251</Text>
          </View>

          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="09XX XXX XXX"
            placeholderTextColor={Colors.text.disabled}
            // Show formatted (with space) but store raw digits
            value={displayFormat(raw)}
            onChangeText={handleChange}
            maxLength={11} // "09XX XXX XXX" = 11 chars with space
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
        </View>

        {/* Network hint */}
        {networkHint && (
          <Text style={styles.networkHint}>📶 {networkHint}</Text>
        )}

        {/* Inline validation error */}
        {raw.length > 0 && !valid && (
          <Text style={styles.error}>
            Enter a valid number starting with 09, 9, 07, or 7
          </Text>
        )}

        {/* Format helper */}
        <Text style={styles.formatHelper}>
          Accepted: 09XXXXXXXX · 9XXXXXXXX · 07XXXXXXXX · 7XXXXXXXX
        </Text>

        <Pressable
          style={[styles.cta, !valid && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!valid}
        >
          <Text style={styles.ctaText}>Send Code</Text>
        </Pressable>

        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.link}>Terms</Text> &{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1FAF4',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  illustEmoji: { fontSize: 36 },

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
    marginBottom: Spacing.lg,
  },

  inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },

  flagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
  },
  flag: { fontSize: 18 },
  flagCode: { fontWeight: '600', color: Colors.text.primary },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
    backgroundColor: Colors.background.primary,
    color: Colors.text.primary,
  },

  networkHint: {
    color: Colors.brand.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  error: { color: Colors.semantic.error, fontSize: 13, marginTop: 2 },

  formatHelper: {
    color: Colors.text.tertiary,
    fontSize: 11,
    marginTop: 4,
  },

  cta: {
    backgroundColor: Colors.brand.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  terms: {
    textAlign: 'center',
    color: Colors.text.tertiary,
    fontSize: 12,
    marginTop: Spacing.md,
  },
  link: { color: Colors.brand.primary, fontWeight: '600' },
});