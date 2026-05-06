import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../src/constants';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>←</Text></Pressable>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusBadge}><Text style={styles.statusText}>CONFIRMED</Text></View>
          <Text style={styles.refLabel}>Reference</Text>
          <Text style={styles.refValue}>ADR-7X4K9M</Text>
        </View>

        <View style={styles.routeCard}>
          <Text style={styles.routeTitle}>Addis Ababa → Hawassa</Text>
          <Text style={styles.routeMeta}>Tuesday, 6 May 2026</Text>
          <View style={styles.timesRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>DEPART</Text>
              <Text style={styles.timeBoxValue}>07:30 AM</Text>
              <Text style={styles.timeBoxCity}>Addis Ababa</Text>
            </View>
            <View style={styles.arrow}><Text style={styles.arrowText}>→</Text></View>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>ARRIVE</Text>
              <Text style={styles.timeBoxValue}>01:30 PM</Text>
              <Text style={styles.timeBoxCity}>Hawassa</Text>
            </View>
          </View>
        </View>

        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>DK</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>Daniel Kebede</Text>
            <Text style={styles.driverMeta}>★ 4.8 · 142 trips</Text>
            <Text style={styles.verified}>✓ Verified by አድራሽ</Text>
          </View>
          <Pressable style={styles.callBtn}>
            <Text style={styles.callIcon}>📞</Text>
          </Pressable>
        </View>

        <View style={styles.busCard}>
          <Text style={styles.cardTitle}>Bus Information</Text>
          <Row label="Vehicle" value="Toyota Coaster · 2022" />
          <Row label="Plate" value="ET-A-12345" />
          <Row label="Capacity" value="28 seats" />
          <View style={styles.amenityRow}>
            {['❄️ AC', '📶 WiFi', '🔌 Charging', '🧳 Luggage'].map((a) => (
              <View key={a} style={styles.amenity}><Text style={styles.amenityText}>{a}</Text></View>
            ))}
          </View>
        </View>

        <View style={styles.itineraryCard}>
          <Text style={styles.cardTitle}>Itinerary</Text>
          {[
            { time: '07:30', name: 'Addis Ababa · Kality Terminal', primary: true },
            { time: '08:45', name: 'Mojo' },
            { time: '10:30', name: 'Ziway' },
            { time: '12:00', name: 'Shashemene' },
            { time: '13:30', name: 'Hawassa Main Station', primary: true },
          ].map((s, i) => (
            <View key={i} style={styles.stop}>
              <View style={styles.stopLeft}>
                <View style={[styles.stopDot, s.primary && styles.stopDotPrimary]} />
                {i < 4 && <View style={styles.stopLine} />}
              </View>
              <View style={styles.stopRight}>
                <Text style={styles.stopTime}>{s.time}</Text>
                <Text style={[styles.stopName, s.primary && styles.stopNamePrimary]}>{s.name}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sosCard}>
          <Text style={styles.sosTitle}>🚨 In an emergency</Text>
          <Text style={styles.sosSub}>Press SOS during your trip to alert dispatch and your emergency contact.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={() => router.push(`/trip/${id}/tracking`)}>
          <Text style={styles.ctaText}>Track Live Location</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: Colors.background.primary },
  back: { fontSize: 26, color: Colors.text.primary },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.lg, gap: Spacing.md },
  statusCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', ...Shadow.sm },
  statusBadge: { backgroundColor: Colors.semantic.success, paddingHorizontal: 14, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  refLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '700', marginTop: Spacing.sm },
  refValue: { fontFamily: 'monospace', fontWeight: '800', fontSize: 20, color: Colors.text.primary },
  routeCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm },
  routeTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  routeMeta: { color: Colors.text.tertiary, fontSize: 13, marginTop: 2 },
  timesRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: Spacing.sm },
  timeBox: { flex: 1, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, padding: Spacing.md },
  timeBoxLabel: { fontSize: 10, color: Colors.text.tertiary, fontWeight: '700' },
  timeBoxValue: { fontWeight: '800', fontSize: 16, color: Colors.text.primary, marginTop: 2 },
  timeBoxCity: { color: Colors.text.secondary, fontSize: 12, marginTop: 2 },
  arrow: { paddingHorizontal: 4 },
  arrowText: { fontSize: 22, color: Colors.brand.primary },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm },
  driverAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  driverName: { fontWeight: '800', fontSize: 16, color: Colors.text.primary },
  driverMeta: { color: Colors.text.secondary, fontSize: 13, marginTop: 2 },
  verified: { color: Colors.semantic.success, fontSize: 11, fontWeight: '700', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.semantic.success, alignItems: 'center', justifyContent: 'center' },
  callIcon: { fontSize: 18 },
  busCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm, gap: 4 },
  cardTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 14, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { color: Colors.text.tertiary, fontSize: 13 },
  rowValue: { color: Colors.text.primary, fontSize: 13, fontWeight: '600' },
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  amenity: { backgroundColor: Colors.background.secondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  amenityText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },
  itineraryCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm },
  stop: { flexDirection: 'row', gap: Spacing.md },
  stopLeft: { width: 16, alignItems: 'center' },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border.medium, marginTop: 4 },
  stopDotPrimary: { backgroundColor: Colors.brand.primary, width: 12, height: 12, borderRadius: 6 },
  stopLine: { width: 2, flex: 1, backgroundColor: Colors.border.light, marginTop: 2 },
  stopRight: { flex: 1, paddingBottom: Spacing.md },
  stopTime: { fontWeight: '700', color: Colors.text.tertiary, fontSize: 12 },
  stopName: { color: Colors.text.secondary, fontSize: 14, marginTop: 2 },
  stopNamePrimary: { color: Colors.text.primary, fontWeight: '700' },
  sosCard: { backgroundColor: Colors.semantic.errorLight, borderRadius: BorderRadius.lg, padding: Spacing.md },
  sosTitle: { fontWeight: '800', color: Colors.semantic.error, fontSize: 14 },
  sosSub: { color: Colors.text.secondary, fontSize: 12, marginTop: 4 },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border.light, backgroundColor: Colors.background.primary },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
