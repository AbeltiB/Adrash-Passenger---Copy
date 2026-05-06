import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

const TAKEN = new Set([2, 5, 6, 11, 17, 22, 23]);
const TOTAL = 28;
const COLS = 4; // 2-aisle-2

export default function SeatsScreen() {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (n: number) => {
    if (TAKEN.has(n)) return;
    setSelected((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < 4 ? [...prev, n] : prev,
    );
  };

  const seatStyle = (n: number) => {
    if (TAKEN.has(n)) return [styles.seat, styles.seatTaken];
    if (selected.includes(n)) return [styles.seat, styles.seatSelected];
    return [styles.seat, styles.seatAvail];
  };

  const seatTextStyle = (n: number) => {
    if (TAKEN.has(n)) return [styles.seatText, styles.seatTakenText];
    if (selected.includes(n)) return [styles.seatText, styles.seatSelectedText];
    return styles.seatText;
  };

  const rows = Math.ceil(TOTAL / COLS);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>←</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Choose your seats</Text>
          <Text style={styles.step}>Step 3 of 6 · Select up to 4</Text>
        </View>
      </View>

      <View style={styles.timer}>
        <Text style={styles.timerText}>⏱ Seats held for 09:32</Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: Colors.seat.available, borderColor: Colors.seat.availableBorder }]} /><Text style={styles.legendText}>Available</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: Colors.seat.occupied, borderColor: Colors.seat.occupiedBorder }]} /><Text style={styles.legendText}>Taken</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: Colors.seat.selected }]} /><Text style={styles.legendText}>Selected</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.bus}>
        <View style={styles.driverRow}>
          <Text style={styles.driverLabel}>🚐 Driver</Text>
        </View>
        <View style={styles.grid}>
          {Array.from({ length: rows }).map((_, r) => (
            <View key={r} style={styles.row}>
              {[0, 1].map((i) => {
                const n = r * COLS + i + 1;
                if (n > TOTAL) return <View key={i} style={styles.seatPlaceholder} />;
                return (
                  <Pressable key={i} style={seatStyle(n)} onPress={() => toggle(n)}>
                    <Text style={seatTextStyle(n)}>{n}</Text>
                  </Pressable>
                );
              })}
              <View style={styles.aisle} />
              {[2, 3].map((i) => {
                const n = r * COLS + i + 1;
                if (n > TOTAL) return <View key={i} style={styles.seatPlaceholder} />;
                return (
                  <Pressable key={i} style={seatStyle(n)} onPress={() => toggle(n)}>
                    <Text style={seatTextStyle(n)}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.selSub}>{selected.length} seat(s) · ETB {selected.length * 650}</Text>
          <Text style={styles.selNums}>{selected.length ? `Seat ${selected.join(', ')}` : 'Tap a seat to select'}</Text>
        </View>
        <Pressable
          style={[styles.cta, selected.length === 0 && styles.ctaDisabled]}
          onPress={() => selected.length > 0 && router.push('/booking/passengers')}
          disabled={selected.length === 0}
        >
          <Text style={styles.ctaText}>Continue</Text>
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
  timer: { backgroundColor: Colors.semantic.warningLight, padding: 10, alignItems: 'center' },
  timerText: { color: Colors.semantic.warning, fontWeight: '700', fontSize: 12 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', padding: Spacing.md, backgroundColor: Colors.background.primary },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  legendText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '500' },
  bus: { padding: Spacing.lg, alignItems: 'center' },
  driverRow: { width: '100%', alignItems: 'flex-end', marginBottom: Spacing.md },
  driverLabel: { color: Colors.text.tertiary, fontWeight: '600' },
  grid: {
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl,
    padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm,
    borderWidth: 2, borderColor: Colors.border.light,
  },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  seat: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  seatPlaceholder: { width: 44, height: 44 },
  seatAvail: { backgroundColor: Colors.seat.available, borderColor: Colors.seat.availableBorder },
  seatTaken: { backgroundColor: Colors.seat.occupied, borderColor: Colors.seat.occupiedBorder },
  seatSelected: { backgroundColor: Colors.seat.selected, borderColor: Colors.seat.selected },
  seatText: { fontWeight: '700', color: Colors.text.primary },
  seatTakenText: { color: Colors.semantic.error, textDecorationLine: 'line-through' },
  seatSelectedText: { color: '#fff' },
  aisle: { width: 16 },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  selSub: { fontWeight: '700', color: Colors.text.primary },
  selNums: { color: Colors.text.tertiary, fontSize: 12 },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 12, paddingHorizontal: Spacing.lg },
  ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
