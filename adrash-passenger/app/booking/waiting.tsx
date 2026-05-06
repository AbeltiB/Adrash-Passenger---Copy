import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';

export default function WaitingScreen() {
  const [seconds, setSeconds] = useState(295);
  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    const t = setInterval(() => setPulse((p) => (p === 1 ? 1.2 : 1)), 800);
    return () => clearInterval(t);
  }, []);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.providerBox}>
          <Text style={styles.providerLogo}>📱</Text>
          <Text style={styles.providerName}>Telebirr</Text>
        </View>

        <View style={styles.pulseWrap}>
          <View style={[styles.pulse3, { transform: [{ scale: pulse * 1.4 }] }]} />
          <View style={[styles.pulse2, { transform: [{ scale: pulse * 1.2 }] }]} />
          <View style={[styles.pulse1, { transform: [{ scale: pulse }] }]}>
            <Text style={styles.pulseEmoji}>⌛</Text>
          </View>
        </View>

        <Text style={styles.title}>Waiting for confirmation</Text>
        <Text style={styles.subtitle}>
          Open your Telebirr app and confirm the payment request to complete your booking.
        </Text>

        <View style={styles.refBox}>
          <Text style={styles.refLabel}>Transaction reference</Text>
          <Text style={styles.refValue}>TRX-A8K2N9P</Text>
        </View>

        <Text style={styles.timer}>
          {m}:{String(s).padStart(2, '0')}
        </Text>
        <Text style={styles.timerLabel}>Time remaining</Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={() => router.replace('/booking/confirmation')}>
          <Text style={styles.ctaText}>I&apos;ve completed the payment</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel payment</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  providerBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  providerLogo: { fontSize: 24 },
  providerName: { fontSize: 18, fontWeight: '800', color: Colors.payment.telebirr },
  pulseWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  pulse1: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.brand.primary,
    alignItems: 'center', justifyContent: 'center', position: 'absolute',
  },
  pulse2: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.brand.primary, opacity: 0.3, position: 'absolute' },
  pulse3: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.brand.primary, opacity: 0.15, position: 'absolute' },
  pulseEmoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text.primary, textAlign: 'center', marginTop: Spacing.lg },
  subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', lineHeight: 20 },
  refBox: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', minWidth: 220, marginTop: Spacing.md },
  refLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
  refValue: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  timer: { fontSize: 32, fontWeight: '800', color: Colors.brand.primary, marginTop: Spacing.lg },
  timerLabel: { color: Colors.text.tertiary, fontSize: 12 },
  footer: { padding: Spacing.lg, gap: Spacing.md },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancel: { textAlign: 'center', color: Colors.text.tertiary, fontWeight: '500' },
});
