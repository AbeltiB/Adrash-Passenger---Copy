import { useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

const ADRASH_LOGO = require('../../assets/Logo Adrash one.png');

const POPULAR_ROUTES = [
  { from: 'Addis Ababa', to: 'Hawassa', fare: 650 },
  { from: 'Addis Ababa', to: 'Bahir Dar', fare: 950 },
  { from: 'Addis Ababa', to: 'Gondar', fare: 1100 },
  { from: 'Addis Ababa', to: 'Mekelle', fare: 1450 },
];

const RECENT = [
  { from: 'Addis Ababa', to: 'Adama', date: 'Mon, 4 May' },
  { from: 'Hawassa', to: 'Addis Ababa', date: 'Sun, 27 Apr' },
];

export default function HomeTab() {
  const [from, setFrom] = useState('Addis Ababa');
  const [to, setTo] = useState('Hawassa');
  const swap = () => { const a = from; setFrom(to); setTo(a); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Image source={ADRASH_LOGO} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
              <Text style={styles.iconText}>🔔</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
            </Pressable>
            <View style={styles.avatar}><Text style={styles.avatarText}>S</Text></View>
          </View>
        </View>

        <Text style={styles.greeting}>Good morning, Selam 👋</Text>
        <Text style={styles.greetingSub}>Where are you going today?</Text>

        <View style={styles.searchCard}>
          <Pressable style={styles.field}>
            <Text style={styles.fieldLabel}>FROM</Text>
            <Text style={styles.fieldValue}>{from}</Text>
          </Pressable>
          <Pressable style={styles.swap} onPress={swap}>
            <Text style={styles.swapIcon}>⇅</Text>
          </Pressable>
          <Pressable style={styles.field}>
            <Text style={styles.fieldLabel}>TO</Text>
            <Text style={styles.fieldValue}>{to}</Text>
          </Pressable>
          <View style={styles.row}>
            <View style={styles.subField}>
              <Text style={styles.fieldLabel}>📅 DATE</Text>
              <Text style={styles.subValue}>Tue, 6 May</Text>
            </View>
            <View style={styles.subField}>
              <Text style={styles.fieldLabel}>👥 PASSENGERS</Text>
              <Text style={styles.subValue}>1 passenger</Text>
            </View>
          </View>
          <Pressable style={styles.searchBtn} onPress={() => router.push('/search/results')}>
            <Text style={styles.searchBtnText}>Search Routes</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Your recent routes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
          {RECENT.map((r, i) => (
            <Pressable key={i} style={styles.recentCard} onPress={() => router.push('/search/results')}>
              <Text style={styles.recentRoute}>{r.from} → {r.to}</Text>
              <Text style={styles.recentDate}>{r.date}</Text>
              <Text style={styles.recentLink}>Book again →</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Popular routes</Text>
        {POPULAR_ROUTES.map((r, i) => (
          <Pressable key={i} style={styles.popularCard} onPress={() => router.push('/search/results')}>
            <View style={styles.popularLeft}>
              <Text style={styles.popularIcon}>🚌</Text>
              <View>
                <Text style={styles.popularRoute}>{r.from} → {r.to}</Text>
                <Text style={styles.popularSub}>From ETB {r.fare} · 6h journey</Text>
              </View>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 100, height: 36 },
  headerRight: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  badge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.semantic.error, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.text.primary, marginTop: Spacing.sm },
  greetingSub: { fontSize: 14, color: Colors.text.tertiary, marginBottom: Spacing.sm },
  searchCard: {
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl,
    padding: Spacing.base, gap: Spacing.sm, ...Shadow.md,
  },
  field: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, padding: Spacing.md },
  fieldLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '700', letterSpacing: 0.5 },
  fieldValue: { fontSize: 17, color: Colors.text.primary, fontWeight: '700', marginTop: 2 },
  swap: {
    alignSelf: 'center', position: 'absolute', right: 24, top: 64,
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.brand.primary,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  swapIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  subField: { flex: 1, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, padding: Spacing.md },
  subValue: { fontSize: 14, color: Colors.text.primary, fontWeight: '600', marginTop: 2 },
  searchBtn: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.xs },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.md },
  recentRow: { gap: Spacing.sm, paddingVertical: 4 },
  recentCard: {
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, width: 200, ...Shadow.sm,
  },
  recentRoute: { fontWeight: '700', color: Colors.text.primary },
  recentDate: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  recentLink: { color: Colors.brand.primary, fontWeight: '700', marginTop: Spacing.sm, fontSize: 13 },
  popularCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg,
    padding: Spacing.md, ...Shadow.sm,
  },
  popularLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  popularIcon: { fontSize: 24 },
  popularRoute: { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
  popularSub: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  chev: { fontSize: 24, color: Colors.text.tertiary },
});
