import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { useAuthStore } from '../../src/features/auth/store/authStore';

export default function SetupScreen() {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const valid = first.trim().length >= 2 && last.trim().length >= 2;

  const finish = () => {
    setAuthenticated(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.illust}><Text style={styles.illustEmoji}>👋</Text></View>
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.subtitle}>This helps drivers and dispatchers identify you</Text>

        <Text style={styles.label}>First name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Selam"
          placeholderTextColor={Colors.text.disabled}
          value={first}
          onChangeText={setFirst}
        />
        <Text style={styles.label}>Last name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tadesse"
          placeholderTextColor={Colors.text.disabled}
          value={last}
          onChangeText={setLast}
        />

        <Pressable
          style={[styles.cta, !valid && styles.ctaDisabled]}
          onPress={finish}
          disabled={!valid}
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary, padding: Spacing.xl },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.sm },
  illust: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1FAF4',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md,
  },
  illustEmoji: { fontSize: 36 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', marginBottom: Spacing.lg },
  label: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600', marginTop: Spacing.sm },
  input: {
    borderWidth: 1, borderColor: Colors.border.medium, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: 16,
    backgroundColor: Colors.background.primary, color: Colors.text.primary,
  },
  cta: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.xl },
  ctaDisabled: { backgroundColor: Colors.neutral.gray300 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
