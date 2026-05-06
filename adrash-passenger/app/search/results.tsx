import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

const TRIPS = [
  { id: 't1', depart: '06:00 AM', arrive: '12:00 PM', bus: 'Toyota Coaster', amenities: ['AC', 'WiFi', 'Charging'], seats: 12, fare: 650 },
  { id: 't2', depart: '07:30 AM', arrive: '01:30 PM', bus: 'Higer Bus', amenities: ['AC', 'WiFi', 'Luggage'], seats: 8, fare: 720 },
  { id: 't3', depart: '10:00 AM', arrive: '04:00 PM', bus: 'Mercedes Sprinter', amenities: ['AC', 'Charging'], seats: 4, fare: 800 },
  { id: 't4', depart: '02:00 PM', arrive: '08:00 PM', bus: 'Toyota Coaster', amenities: ['AC', 'WiFi'], seats: 18, fare: 650 },
];

type Filter = 'all' | 'earliest' | 'cheapest' | 'seats';

export default function ResultsScreen() {
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.route}>Addis Ababa → Hawassa</Text>
          <Text style={styles.meta}>Tue, 6 May · 1 passenger</Text>
        </View>
        <Pressable><Text style={styles.edit}>Edit</Text></Pressable>
      </View>

      <View style={styles.filters}>
        {(['all', 'earliest', 'cheapest', 'seats'] as Filter[]).map((f) => (
          <Pressable key={f} style={[styles.pill, filter === f && styles.pillActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f === 'seats' ? 'Most seats' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {TRIPS.map((t) => (
          <Pressable key={t.id} style={styles.card} onPress={() => router.push('/booking/pickup')}>
            <View style={styles.times}>
              <Text style={styles.time}>{t.depart}</Text>
              <View style={styles.lineWrap}>
                <View style={styles.dot} />
                <View style={styles.line} />
                <View style={styles.dot} />
              </View>
              <Text style={styles.time}>{t.arrive}</Text>
            </View>
            <View style={styles.cities}>
              <Text style={styles.city}>Addis Ababa</Text>
              <Text style={styles.duration}>~6h</Text>
              <Text style={styles.city}>Hawassa</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.bottomRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bus}>🚌 {t.bus}</Text>
                <Text style={styles.amen}>{t.amenities.join(' · ')}</Text>
                <Text style={styles.seats}>{t.seats} seats available</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>From</Text>
                <Text style={styles.price}>ETB {t.fare}</Text>
                <Text style={styles.priceSub}>/seat</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.background.primary },
  back: { fontSize: 26, color: Colors.text.primary },
  route: { fontWeight: '800', fontSize: 16, color: Colors.text.primary },
  meta: { color: Colors.text.tertiary, fontSize: 12 },
  edit: { color: Colors.brand.primary, fontWeight: '700' },
  filters: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.background.primary },
  pill: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.background.secondary },
  pillActive: { backgroundColor: Colors.brand.primary },
  pillText: { color: Colors.text.secondary, fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#fff' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm },
  times: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  time: { fontWeight: '800', fontSize: 18, color: Colors.text.primary },
  lineWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand.primary },
  line: { flex: 1, height: 2, backgroundColor: Colors.brand.primary, opacity: 0.4 },
  cities: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  city: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  duration: { color: Colors.text.tertiary, fontSize: 12 },
  divider: { height: 1, backgroundColor: Colors.border.light, marginVertical: Spacing.sm },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  bus: { fontWeight: '700', color: Colors.text.primary, fontSize: 13 },
  amen: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  seats: { color: Colors.semantic.success, fontSize: 12, fontWeight: '600', marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  priceLabel: { color: Colors.text.tertiary, fontSize: 11 },
  price: { fontWeight: '800', fontSize: 18, color: Colors.brand.primary },
  priceSub: { color: Colors.text.tertiary, fontSize: 11 },
});
