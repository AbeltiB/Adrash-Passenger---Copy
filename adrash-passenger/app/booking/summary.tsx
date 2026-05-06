import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

export default function SummaryScreen() {
  const [redeem, setRedeem] = useState(false);
  const baseFare = 1300;
  const serviceFee = 30;
  const tax = 19.5;
  const discount = redeem ? 100 : 0;
  const total = baseFare + serviceFee + tax - discount;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>←</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Review your booking</Text>
          <Text style={styles.step}>Step 5 of 6</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.routeTitle}>Addis Ababa → Hawassa</Text>
          <Text style={styles.routeMeta}>Tuesday, 6 May 2026 · 07:30 AM</Text>
          <View style={styles.divider} />
          <Row label="Pickup" value="Kality Bus Terminal" />
          <Row label="Drop-off" value="Hawassa Main Station" />
          <Row label="Seats" value="14, 15" />
          <Row label="Passengers" value="2" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Passengers</Text>
          {['Selam Tadesse · Seat 14', 'Abebe Kebede · Seat 15'].map((p) => (
            <View key={p} style={styles.paxRow}>
              <Text style={styles.paxIcon}>👤</Text>
              <Text style={styles.paxText}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare breakdown</Text>
          <Row label="Base fare (2 × ETB 650)" value={`ETB ${baseFare.toFixed(2)}`} />
          <Row label="Service fee" value={`ETB ${serviceFee.toFixed(2)}`} />
          <Row label="Tax" value={`ETB ${tax.toFixed(2)}`} />
          {discount > 0 && <Row label="Reward discount" value={`-ETB ${discount.toFixed(2)}`} accent />}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>ETB {total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.rewardCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardTitle}>🎁 Apply reward points</Text>
            <Text style={styles.rewardSub}>Redeem 1,000 points for ETB 100 off · Balance 1,288</Text>
          </View>
          <Switch value={redeem} onValueChange={setRedeem} trackColor={{ true: Colors.brand.primary, false: Colors.neutral.gray300 }} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={() => router.push('/booking/payment')}>
          <Text style={styles.ctaText}>Proceed to Payment · ETB {total.toFixed(2)}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && { color: Colors.semantic.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.background.primary },
  back: { fontSize: 26, color: Colors.text.primary },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  step: { fontSize: 12, color: Colors.text.tertiary },
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm, gap: 6 },
  routeTitle: { fontWeight: '800', fontSize: 18, color: Colors.text.primary },
  routeMeta: { color: Colors.text.tertiary, fontSize: 13 },
  cardTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 14, marginBottom: 4 },
  divider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: Colors.text.tertiary, fontSize: 13 },
  rowValue: { color: Colors.text.primary, fontSize: 13, fontWeight: '600' },
  paxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  paxIcon: { fontSize: 16 },
  paxText: { color: Colors.text.secondary, fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontWeight: '800', color: Colors.text.primary, fontSize: 16 },
  totalValue: { fontWeight: '800', color: Colors.brand.primary, fontSize: 22 },
  rewardCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm },
  rewardTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
  rewardSub: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border.light, backgroundColor: Colors.background.primary },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
