import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';

const SEATS = [14, 15];

type Pax = { name: string; phone: string; nokName: string; nokPhone: string; gender: 'M' | 'F' | null };

export default function PassengersScreen() {
  const [pax, setPax] = useState<Pax[]>(
    SEATS.map(() => ({ name: '', phone: '', nokName: '', nokPhone: '', gender: null })),
  );
  const [expanded, setExpanded] = useState(0);

  const update = (i: number, field: keyof Pax, value: string | 'M' | 'F') => {
    setPax((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const filled = (p: Pax) => p.name && p.phone && p.nokName && p.nokPhone && p.gender;
  const allValid = pax.every(filled);
  const filledCount = pax.filter(filled).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>←</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Passenger details</Text>
          <Text style={styles.step}>Step 4 of 6 · {filledCount}/{SEATS.length} filled</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {SEATS.map((seat, i) => {
          const open = expanded === i;
          return (
            <View key={seat} style={[styles.card, filled(pax[i]) && styles.cardDone]}>
              <Pressable style={styles.cardHeader} onPress={() => setExpanded(open ? -1 : i)}>
                <View style={styles.cardHeadL}>
                  <Text style={styles.cardTitle}>Passenger {i + 1}</Text>
                  <View style={styles.seatBadge}><Text style={styles.seatBadgeText}>Seat {seat}</Text></View>
                </View>
                <Text style={styles.expand}>{open ? '▾' : '▸'}</Text>
              </Pressable>
              {open && (
                <View style={styles.fields}>
                  {i === 0 && (
                    <Pressable style={styles.copyBtn} onPress={() => {
                      update(0, 'name', 'Selam Tadesse');
                      update(0, 'phone', '+251 9XX XXX XXX');
                    }}>
                      <Text style={styles.copyText}>📋 Copy from my profile</Text>
                    </Pressable>
                  )}
                  <Text style={styles.label}>Full name</Text>
                  <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={Colors.text.disabled}
                    value={pax[i].name} onChangeText={(v) => update(i, 'name', v)} />

                  <Text style={styles.label}>Phone</Text>
                  <TextInput style={styles.input} placeholder="+251 9XX XXX XXX" placeholderTextColor={Colors.text.disabled}
                    keyboardType="phone-pad" value={pax[i].phone} onChangeText={(v) => update(i, 'phone', v)} />

                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.genderRow}>
                    {(['M', 'F'] as const).map((g) => (
                      <Pressable key={g}
                        style={[styles.genderBtn, pax[i].gender === g && styles.genderActive]}
                        onPress={() => update(i, 'gender', g)}>
                        <Text style={[styles.genderText, pax[i].gender === g && styles.genderTextActive]}>
                          {g === 'M' ? 'Male' : 'Female'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.divider}>Emergency contact</Text>
                  <Text style={styles.label}>Next of kin name</Text>
                  <TextInput style={styles.input} placeholder="Next of kin name" placeholderTextColor={Colors.text.disabled}
                    value={pax[i].nokName} onChangeText={(v) => update(i, 'nokName', v)} />

                  <Text style={styles.label}>Next of kin phone</Text>
                  <TextInput style={styles.input} placeholder="+251 9XX XXX XXX" placeholderTextColor={Colors.text.disabled}
                    keyboardType="phone-pad" value={pax[i].nokPhone} onChangeText={(v) => update(i, 'nokPhone', v)} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, !allValid && styles.ctaDisabled]}
          onPress={() => allValid && router.push('/booking/summary')}
          disabled={!allValid}
        >
          <Text style={styles.ctaText}>Continue to Summary</Text>
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
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, ...Shadow.sm, borderWidth: 1.5, borderColor: 'transparent' },
  cardDone: { borderColor: Colors.semantic.success },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, justifyContent: 'space-between' },
  cardHeadL: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
  seatBadge: { backgroundColor: Colors.brand.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full },
  seatBadgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  expand: { fontSize: 18, color: Colors.text.tertiary },
  fields: { padding: Spacing.md, paddingTop: 0, gap: 6 },
  copyBtn: { paddingVertical: 8 },
  copyText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 13 },
  label: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginTop: Spacing.sm },
  input: {
    borderWidth: 1, borderColor: Colors.border.medium, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: 14,
    backgroundColor: Colors.background.primary, color: Colors.text.primary,
  },
  genderRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.medium, alignItems: 'center' },
  genderActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  genderText: { color: Colors.text.primary, fontWeight: '600' },
  genderTextActive: { color: '#fff' },
  divider: { fontSize: 11, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.5, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border.light },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border.light, backgroundColor: Colors.background.primary },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
