import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

const PICKUPS = [
  { id: 'p1', name: 'Kality Bus Terminal', desc: 'Main terminal · Adv. ticket pickup', dist: '2.4 km' },
  { id: 'p2', name: 'Akaki Junction', desc: 'In front of Total petrol station', dist: '5.1 km' },
  { id: 'p3', name: 'Bishoftu Roundabout', desc: 'Near city park entrance', dist: '38 km' },
  { id: 'p4', name: 'Mojo Bus Station', desc: 'Mojo town centre', dist: '72 km' },
];

export default function PickupScreen() {
  const [selected, setSelected] = useState<string | null>('p1');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>←</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Where will you board?</Text>
          <Text style={styles.step}>Step 2 of 6</Text>
        </View>
      </View>

      <View style={styles.mapPreview}>
        <Text style={styles.mapEmoji}>🗺️</Text>
        <Text style={styles.mapText}>Route map · 4 pickup points</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {PICKUPS.map((p) => {
          const active = selected === p.id;
          return (
            <Pressable
              key={p.id}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => setSelected(p.id)}
            >
              <View style={[styles.pin, active && styles.pinActive]}>
                <Text style={styles.pinText}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.desc}>{p.desc}</Text>
                <Text style={styles.dist}>{p.dist} from you</Text>
              </View>
              {active && <Text style={styles.check}>✓</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, !selected && styles.ctaDisabled]}
          onPress={() => selected && router.push('/booking/seats')}
          disabled={!selected}
        >
          <Text style={styles.ctaText}>Confirm Pickup</Text>
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
  mapPreview: {
    height: 180, backgroundColor: '#E8F0E8', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.border.light, gap: 4,
  },
  mapEmoji: { fontSize: 48 },
  mapText: { color: Colors.text.tertiary, fontSize: 13, fontWeight: '500' },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1.5, borderColor: 'transparent', ...Shadow.sm,
  },
  cardActive: { borderColor: Colors.brand.primary, backgroundColor: '#F1FAF4' },
  pin: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background.secondary, alignItems: 'center', justifyContent: 'center' },
  pinActive: { backgroundColor: Colors.brand.secondary },
  pinText: { fontSize: 16 },
  name: { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
  desc: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  dist: { color: Colors.semantic.info, fontSize: 11, fontWeight: '600', marginTop: 2 },
  check: { color: Colors.brand.primary, fontSize: 22, fontWeight: '800' },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border.light, backgroundColor: Colors.background.primary },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
