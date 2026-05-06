import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';
import { useAuthStore } from '../../src/features/auth/store/authStore';

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: '👤', label: 'Personal Info', sub: 'Selam Tadesse · +251 9XX XXX XXX' },
      { icon: '📍', label: 'Saved Locations', sub: '3 locations' },
      { icon: '🚨', label: 'Emergency Contacts', sub: '1 contact saved' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: '🌐', label: 'Language', sub: 'English' },
      { icon: '🔔', label: 'Notifications', sub: 'Trip + promo' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: '💬', label: 'Help & FAQ', sub: '' },
      { icon: '📜', label: 'Terms & Privacy', sub: '' },
      { icon: 'ℹ️', label: 'About አድራሽ', sub: 'v1.0.0' },
    ],
  },
];

export default function ProfileTab() {
  const logout = useAuthStore((s) => s.logout);
  const [bio, setBio] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>S</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Selam Tadesse</Text>
            <Text style={styles.phone}>+251 9XX XXX XXX</Text>
            <Text style={styles.member}>Member since Apr 2026</Text>
          </View>
          <Pressable style={styles.editBtn}><Text style={styles.editText}>Edit</Text></Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>1,288</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>★ Rating</Text>
          </View>
        </View>

        <View style={styles.bioCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bioTitle}>Biometric Login</Text>
            <Text style={styles.bioSub}>Use Face ID or fingerprint to sign in faster</Text>
          </View>
          <Switch value={bio} onValueChange={setBio} trackColor={{ true: Colors.brand.primary, false: Colors.neutral.gray300 }} />
        </View>

        {SECTIONS.map((sec) => (
          <View key={sec.title}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.sectionCard}>
              {sec.items.map((it, i) => (
                <Pressable key={it.label} style={[styles.row, i > 0 && styles.rowDivider]}>
                  <Text style={styles.rowIcon}>{it.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{it.label}</Text>
                    {it.sub ? <Text style={styles.rowSub}>{it.sub}</Text> : null}
                  </View>
                  <Text style={styles.chev}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable style={styles.logout} onPress={() => { logout(); router.replace('/(auth)'); }}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  phone: { color: Colors.text.secondary, fontSize: 13 },
  member: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  editBtn: { borderWidth: 1, borderColor: Colors.brand.primary, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full },
  editText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 12 },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, ...Shadow.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.brand.primary },
  statLabel: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  bioCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm,
  },
  bioTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
  bioSub: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.5, marginTop: Spacing.sm },
  sectionCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, ...Shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.border.light },
  rowIcon: { fontSize: 22 },
  rowLabel: { color: Colors.text.primary, fontWeight: '600' },
  rowSub: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  chev: { fontSize: 22, color: Colors.text.tertiary },
  logout: {
    borderWidth: 1, borderColor: Colors.semantic.error, borderRadius: BorderRadius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.md,
  },
  logoutText: { color: Colors.semantic.error, fontWeight: '700' },
});
