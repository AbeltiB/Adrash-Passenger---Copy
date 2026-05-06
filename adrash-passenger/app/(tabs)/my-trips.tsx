import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

type Tab = 'upcoming' | 'completed' | 'cancelled';

const UPCOMING = [
  { id: 'mock-trip', from: 'Addis Ababa', to: 'Hawassa', date: 'Tue, 6 May · 07:30 AM', seats: '14, 15', fare: 1349.5, status: 'Confirmed' },
  { id: 'trip-2', from: 'Addis Ababa', to: 'Bahir Dar', date: 'Sat, 10 May · 06:00 AM', seats: '8', fare: 950, status: 'Confirmed' },
];
const COMPLETED = [
  { id: 't-c1', from: 'Hawassa', to: 'Addis Ababa', date: '27 Apr 2026', fare: 650, rating: 5 },
  { id: 't-c2', from: 'Addis Ababa', to: 'Adama', date: '12 Apr 2026', fare: 280, rating: null },
];
const CANCELLED = [
  { id: 't-x1', from: 'Addis Ababa', to: 'Gondar', date: '20 Mar 2026', refund: 'Refunded ETB 1,100' },
];

export default function MyTripsTab() {
  const [tab, setTab] = useState<Tab>('upcoming');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
      </View>

      <View style={styles.tabs}>
        {(['upcoming', 'completed', 'cancelled'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'upcoming' && UPCOMING.map((t) => (
          <View key={t.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.route}>{t.from} → {t.to}</Text>
              <View style={styles.statusBadge}><Text style={styles.statusText}>{t.status}</Text></View>
            </View>
            <Text style={styles.cardSub}>{t.date}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Seat {t.seats}</Text>
              <Text style={styles.meta}>•</Text>
              <Text style={styles.meta}>ETB {t.fare.toLocaleString()}</Text>
            </View>
            <View style={styles.cardBtns}>
              <Pressable style={styles.btnPrimary} onPress={() => router.push(`/trip/${t.id}/tracking`)}>
                <Text style={styles.btnPrimaryText}>Track Trip</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => router.push(`/trip/${t.id}`)}>
                <Text style={styles.btnGhostText}>View Ticket</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {tab === 'completed' && COMPLETED.map((t) => (
          <View key={t.id} style={styles.card}>
            <Text style={styles.route}>{t.from} → {t.to}</Text>
            <Text style={styles.cardSub}>{t.date}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>ETB {t.fare}</Text>
              {t.rating && <Text style={styles.meta}>· {'★'.repeat(t.rating)}</Text>}
            </View>
            <View style={styles.cardBtns}>
              {!t.rating && (
                <Pressable style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Rate Trip</Text>
                </Pressable>
              )}
              <Pressable style={styles.btnGhost} onPress={() => router.push('/(tabs)')}>
                <Text style={styles.btnGhostText}>Book Again</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {tab === 'cancelled' && CANCELLED.map((t) => (
          <View key={t.id} style={styles.card}>
            <Text style={styles.route}>{t.from} → {t.to}</Text>
            <Text style={styles.cardSub}>{t.date}</Text>
            <View style={[styles.statusBadge, styles.refundBadge]}>
              <Text style={styles.refundText}>{t.refund}</Text>
            </View>
          </View>
        ))}

        {((tab === 'upcoming' && UPCOMING.length === 0) ||
          (tab === 'completed' && COMPLETED.length === 0) ||
          (tab === 'cancelled' && CANCELLED.length === 0)) && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎒</Text>
            <Text style={styles.emptyText}>No trips here yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  tab: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.lg, backgroundColor: Colors.background.primary, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.brand.primary },
  tabText: { color: Colors.text.secondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 6, ...Shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  statusBadge: { backgroundColor: Colors.semantic.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { color: Colors.semantic.success, fontWeight: '700', fontSize: 11 },
  cardSub: { color: Colors.text.tertiary, fontSize: 13 },
  metaRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  meta: { color: Colors.text.secondary, fontSize: 13 },
  cardBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  btnPrimary: { flex: 1, backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: Colors.border.medium, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  btnGhostText: { color: Colors.text.primary, fontWeight: '700', fontSize: 13 },
  refundBadge: { alignSelf: 'flex-start', backgroundColor: Colors.semantic.infoLight },
  refundText: { color: Colors.semantic.info, fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: Spacing['3xl'], gap: Spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyText: { color: Colors.text.tertiary },
});
