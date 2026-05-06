import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../src/constants';

const NOTIFS = [
  { id: 'n1', icon: '🚌', title: 'Bus arriving at Kality Terminal', body: 'Your driver is 4 minutes away from your pickup.', time: 'Just now', unread: true, kind: 'trip' },
  { id: 'n2', icon: '✅', title: 'Booking ADR-7X4K9M confirmed', body: 'Payment of ETB 1,249.50 received via Telebirr.', time: '2h ago', unread: true, kind: 'booking' },
  { id: 'n3', icon: '🎁', title: 'You earned 65 points', body: 'Thanks for traveling with አድራሽ! Redeem on your next trip.', time: 'Yesterday', unread: false, kind: 'reward' },
  { id: 'n4', icon: '📣', title: '20% off intercity routes this weekend', body: 'Use code WEEKEND20 at checkout. Valid Sat–Sun only.', time: '2d ago', unread: false, kind: 'promo' },
  { id: 'n5', icon: 'ℹ️', title: 'Updated terms of service', body: 'We refreshed our passenger T&Cs effective May 1, 2026.', time: '5d ago', unread: false, kind: 'system' },
];

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>←</Text></Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable><Text style={styles.markAll}>Mark all read</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {NOTIFS.map((n) => (
          <Pressable key={n.id} style={[styles.item, n.unread && styles.itemUnread]}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>{n.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.itemHead}>
                <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                {n.unread && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text>
              <Text style={styles.itemTime}>{n.time}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: Colors.background.primary },
  back: { fontSize: 26, color: Colors.text.primary },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  markAll: { color: Colors.brand.primary, fontWeight: '700', fontSize: 13 },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  item: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm,
  },
  itemUnread: { backgroundColor: '#F1FAF4' },
  iconBox: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { flex: 1, fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand.primary },
  itemBody: { color: Colors.text.secondary, fontSize: 13, marginTop: 2 },
  itemTime: { color: Colors.text.tertiary, fontSize: 11, marginTop: 4 },
});
