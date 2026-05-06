import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

const HISTORY = [
  { id: '1', label: 'Earned · Hawassa trip', points: '+65', date: '27 Apr', positive: true },
  { id: '2', label: 'Redeemed · Bahir Dar booking', points: '-100', date: '20 Apr', positive: false },
  { id: '3', label: 'Earned · Adama trip', points: '+28', date: '12 Apr', positive: true },
  { id: '4', label: 'Referral bonus · Abel B.', points: '+50', date: '5 Apr', positive: true },
  { id: '5', label: 'Earned · Mekelle trip', points: '+145', date: '20 Mar', positive: true },
];

export default function RewardsTab() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Rewards</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>1,288</Text>
            <Text style={styles.balanceUnit}>points</Text>
          </View>
          <Text style={styles.balanceEquiv}>≈ ETB 128.80 in discounts</Text>
          <Pressable style={styles.redeem}>
            <Text style={styles.redeemText}>Redeem Points</Text>
          </Pressable>
        </View>

        <View style={styles.referralCard}>
          <Text style={styles.refTitle}>🎁 Refer a friend</Text>
          <Text style={styles.refSub}>Earn 50 points when your friend takes their first trip</Text>
          <View style={styles.refCodeBox}>
            <Text style={styles.refCode}>SELAM-A8K2</Text>
            <Pressable style={styles.refShare}><Text style={styles.refShareText}>Share</Text></Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Points History</Text>
        {HISTORY.map((h) => (
          <View key={h.id} style={styles.histItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.histLabel}>{h.label}</Text>
              <Text style={styles.histDate}>{h.date}</Text>
            </View>
            <Text style={[styles.histPoints, h.positive ? styles.histPos : styles.histNeg]}>
              {h.points}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary },
  balanceCard: {
    backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, gap: 4, ...Shadow.md,
  },
  balanceLabel: { color: '#D7F5E2', fontSize: 13, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  balanceValue: { color: '#fff', fontSize: 44, fontWeight: '800' },
  balanceUnit: { color: '#D7F5E2', fontSize: 16 },
  balanceEquiv: { color: '#D7F5E2', fontSize: 12, marginBottom: Spacing.md },
  redeem: { backgroundColor: '#fff', borderRadius: BorderRadius.lg, paddingVertical: 12, alignItems: 'center' },
  redeemText: { color: Colors.brand.primary, fontWeight: '700' },
  referralCard: {
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, ...Shadow.sm, gap: 6,
  },
  refTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
  refSub: { color: Colors.text.tertiary, fontSize: 13 },
  refCodeBox: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
  refCode: {
    flex: 1, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: Colors.text.primary,
  },
  refShare: { backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  refShareText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.sm },
  histItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadow.sm,
  },
  histLabel: { color: Colors.text.primary, fontWeight: '600' },
  histDate: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  histPoints: { fontWeight: '800', fontSize: 16 },
  histPos: { color: Colors.semantic.success },
  histNeg: { color: Colors.semantic.error },
});
