import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

const METHODS = [
  { id: 'telebirr', icon: '📱', name: 'Telebirr', sub: 'Ethio Telecom · Most popular', tint: Colors.payment.telebirr },
  { id: 'cbe', icon: '🏦', name: 'CBE Birr', sub: 'Commercial Bank of Ethiopia', tint: Colors.payment.cbeBirr },
  { id: 'hello', icon: '💳', name: 'HelloCash', sub: 'Amhara Bank · Postal network', tint: Colors.payment.awash },
  { id: 'adc', icon: '🔷', name: 'ADC', sub: 'ADC Research and Development', tint: Colors.semantic.info },
];

export default function PaymentScreen() {
  const [method, setMethod] = useState<string | null>('telebirr');
  const [phone, setPhone] = useState('+251 9XX XXX XXX');
  const total = 1249.5;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>←</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>How would you like to pay?</Text>
          <Text style={styles.step}>Step 6 of 6</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>ETB {total.toFixed(2)}</Text>
        </View>

        {METHODS.map((m) => {
          const active = method === m.id;
          return (
            <Pressable key={m.id} style={[styles.method, active && styles.methodActive]} onPress={() => setMethod(m.id)}>
              <View style={[styles.icon, { backgroundColor: m.tint }]}>
                <Text style={styles.iconText}>{m.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>{m.name}</Text>
                <Text style={styles.methodSub}>{m.sub}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}

        {method && (
          <View style={styles.phoneBox}>
            <Text style={styles.phoneLabel}>Phone registered with {METHODS.find((m) => m.id === method)?.name}</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor={Colors.text.disabled}
            />
            <View style={styles.secNote}>
              <Text style={styles.lock}>🔒</Text>
              <Text style={styles.secText}>No card information is stored. Payment processed via your provider.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, !method && styles.ctaDisabled]}
          onPress={() => method && router.push('/booking/waiting')}
          disabled={!method}
        >
          <Text style={styles.ctaText}>Pay ETB {total.toFixed(2)}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.background.primary },
  back: { fontSize: 26, color: Colors.text.primary },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  step: { fontSize: 12, color: Colors.text.tertiary },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  totalCard: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.sm },
  totalLabel: { color: '#D7F5E2', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  totalValue: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4 },
  method: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, ...Shadow.sm, borderWidth: 1.5, borderColor: 'transparent',
  },
  methodActive: { borderColor: Colors.brand.primary, backgroundColor: '#F1FAF4' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  methodName: { fontWeight: '700', fontSize: 15, color: Colors.text.primary },
  methodSub: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border.medium, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.brand.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.brand.primary },
  phoneBox: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm, marginTop: Spacing.sm },
  phoneLabel: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.border.medium, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: 15,
    backgroundColor: Colors.background.primary, color: Colors.text.primary,
  },
  secNote: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: Spacing.sm },
  lock: { fontSize: 14 },
  secText: { color: Colors.text.tertiary, fontSize: 11, flex: 1 },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border.light, backgroundColor: Colors.background.primary },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
