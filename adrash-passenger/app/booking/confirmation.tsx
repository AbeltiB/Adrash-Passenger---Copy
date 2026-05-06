import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

export default function ConfirmationScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.successCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>Booking confirmed! 🎉</Text>
        <Text style={styles.subtitle}>Your seats are reserved. Show this to your driver.</Text>

        <View style={styles.refCard}>
          <Text style={styles.refLabel}>BOOKING REFERENCE</Text>
          <Text style={styles.refValue}>ADR-7X4K9M</Text>
          <Pressable style={styles.copyBtn}>
            <Text style={styles.copyText}>📋 Copy reference</Text>
          </Pressable>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrBox}>
            <View style={styles.qrInner}>
              {Array.from({ length: 8 }).map((_, r) => (
                <View key={r} style={styles.qrRow}>
                  {Array.from({ length: 8 }).map((__, c) => (
                    <View
                      key={c}
                      style={[
                        styles.qrCell,
                        (r + c) % 2 === 0 || r === 0 || c === 0 || r === 7 || c === 7
                          ? styles.qrFilled
                          : null,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.qrLabel}>Show this QR code to your driver</Text>
        </View>

        <View style={styles.tripCard}>
          <Text style={styles.tripRoute}>Addis Ababa → Hawassa</Text>
          <Text style={styles.tripMeta}>Tuesday, 6 May · 07:30 AM</Text>
          <View style={styles.tripDivider} />
          <Row label="Pickup" value="Kality Bus Terminal" />
          <Row label="Seats" value="14, 15" />
          <Row label="Passengers" value="2" />
          <Row label="Total paid" value="ETB 1,249.50" />
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn}><Text style={styles.actionText}>📥 Download</Text></Pressable>
          <Pressable style={styles.actionBtn}><Text style={styles.actionText}>📅 Calendar</Text></Pressable>
          <Pressable style={styles.actionBtn}><Text style={styles.actionText}>↗️ Share</Text></Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={() => router.replace('/(tabs)/my-trips')}>
          <Text style={styles.ctaText}>View My Trips</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/trip/mock-trip/tracking')}>
          <Text style={styles.trackLink}>Track my trip →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  content: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.md },
  successCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.semantic.successLight,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg,
    borderWidth: 4, borderColor: Colors.semantic.success,
  },
  checkmark: { fontSize: 48, color: Colors.semantic.success, fontWeight: '900' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center' },
  refCard: { width: '100%', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', ...Shadow.sm },
  refLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 1 },
  refValue: { fontFamily: 'monospace', fontSize: 26, fontWeight: '800', color: Colors.text.primary, marginTop: 4 },
  copyBtn: { marginTop: Spacing.sm },
  copyText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 13 },
  qrCard: { width: '100%', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', ...Shadow.sm },
  qrBox: { padding: Spacing.md, backgroundColor: '#fff', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.light },
  qrInner: { width: 160, height: 160 },
  qrRow: { flexDirection: 'row', flex: 1 },
  qrCell: { flex: 1 },
  qrFilled: { backgroundColor: Colors.text.primary },
  qrLabel: { color: Colors.text.tertiary, fontSize: 12, marginTop: Spacing.sm },
  tripCard: { width: '100%', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm, gap: 4 },
  tripRoute: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  tripMeta: { color: Colors.text.tertiary, fontSize: 13 },
  tripDivider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { color: Colors.text.tertiary, fontSize: 13 },
  rowValue: { color: Colors.text.primary, fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  actionBtn: { flex: 1, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center', ...Shadow.sm },
  actionText: { fontWeight: '600', color: Colors.text.primary, fontSize: 12 },
  footer: { padding: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border.light, backgroundColor: Colors.background.primary },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  trackLink: { textAlign: 'center', color: Colors.brand.primary, fontWeight: '700' },
});
