import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../src/constants';

const STATUSES = [
  { label: 'Driver heading to your pickup', eta: '12 min', progress: 0.25 },
  { label: 'Bus is approaching pickup', eta: '4 min', progress: 0.45 },
  { label: 'Boarded · trip in progress', eta: '5h 30m to Hawassa', progress: 0.65 },
  { label: 'Approaching destination', eta: '15 min', progress: 0.9 },
];

export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [step, setStep] = useState(0);
  const status = STATUSES[step];

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % STATUSES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.mapWrap}>
        <View style={styles.mapBg}>
          <Text style={styles.mapMark}>📍</Text>
          <View style={styles.mapPath} />
          <Text style={[styles.mapMark, styles.busMark]}>🚌</Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
        <Pressable style={styles.sosBtn}>
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.tripHeader}>
          <View>
            <Text style={styles.tripTitle}>Addis Ababa → Hawassa</Text>
            <Text style={styles.tripRef}>Trip · {id}</Text>
          </View>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusEmoji}>🚌</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{status.label}</Text>
            <Text style={styles.eta}>ETA: {status.eta}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${status.progress * 100}%` }]} />
        </View>

        <View style={styles.driverRow}>
          <View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>DK</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>Daniel Kebede</Text>
            <Text style={styles.busPlate}>Toyota Coaster · ET-A-12345</Text>
          </View>
          <Pressable style={styles.callBtn}><Text style={styles.callIcon}>📞</Text></Pressable>
          <Pressable style={styles.msgBtn}><Text style={styles.callIcon}>💬</Text></Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.action}>
            <Text style={styles.actionEmoji}>🎫</Text>
            <Text style={styles.actionText}>Ticket</Text>
          </Pressable>
          <Pressable style={styles.action}>
            <Text style={styles.actionEmoji}>↗️</Text>
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable style={styles.action}>
            <Text style={styles.actionEmoji}>🚨</Text>
            <Text style={styles.actionText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.text.primary },
  mapWrap: { flex: 1, backgroundColor: '#D4E5D4', position: 'relative' },
  mapBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapMark: { position: 'absolute', fontSize: 36, top: '30%', left: '20%' },
  busMark: { top: '55%', left: '60%' },
  mapPath: {
    position: 'absolute', top: '35%', left: '25%', width: '50%', height: 3,
    backgroundColor: Colors.brand.primary, transform: [{ rotate: '25deg' }], opacity: 0.6,
  },
  closeBtn: {
    position: 'absolute', top: Spacing.md, left: Spacing.md, width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shadow.md,
  },
  closeText: { fontSize: 26, color: Colors.text.primary, fontWeight: '300' },
  sosBtn: {
    position: 'absolute', top: Spacing.md, right: Spacing.md,
    backgroundColor: Colors.semantic.error, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: BorderRadius.full, ...Shadow.md,
  },
  sosText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  sheet: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg, gap: Spacing.md, ...Shadow.lg,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border.medium, marginBottom: 4 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  tripRef: { color: Colors.text.tertiary, fontSize: 12 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.semantic.errorLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.semantic.error },
  liveText: { color: Colors.semantic.error, fontWeight: '800', fontSize: 11 },
  statusBox: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', backgroundColor: Colors.background.secondary, padding: Spacing.md, borderRadius: BorderRadius.lg },
  statusEmoji: { fontSize: 32 },
  statusLabel: { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
  eta: { color: Colors.brand.primary, fontWeight: '700', fontSize: 13, marginTop: 2 },
  progressTrack: { height: 6, backgroundColor: Colors.border.light, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.brand.primary },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border.light },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  driverName: { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
  busPlate: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.semantic.success, alignItems: 'center', justifyContent: 'center' },
  msgBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  callIcon: { fontSize: 16 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  action: { flex: 1, alignItems: 'center', backgroundColor: Colors.background.secondary, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, gap: 2 },
  actionEmoji: { fontSize: 20 },
  actionText: { fontWeight: '600', color: Colors.text.secondary, fontSize: 12 },
});
