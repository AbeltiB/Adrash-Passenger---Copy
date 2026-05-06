import { useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../src/constants';

const ADRASH_LOGO = require('../../assets/Logo Adrash one.png');

type Lang = 'en' | 'am' | 'om';
const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'am', label: 'Amharic', native: 'አማርኛ' },
  { code: 'om', label: 'Oromiffa', native: 'Afaan Oromoo' },
];

export default function SplashScreen() {
  const [lang, setLang] = useState<Lang>('en');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.brandWrap}>
        <Image source={ADRASH_LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Your journey, safely delivered.</Text>
      </View>

      <View style={styles.langSection}>
        <Text style={styles.langTitle}>Choose your language</Text>
        {LANGUAGES.map((l) => {
          const selected = lang === l.code;
          return (
            <Pressable
              key={l.code}
              style={[styles.langBtn, selected && styles.langBtnSelected]}
              onPress={() => setLang(l.code)}
            >
              <Text style={[styles.langText, selected && styles.langTextSelected]}>{l.native}</Text>
              {selected && <Text style={styles.check}>✓</Text>}
            </Pressable>
          );
        })}

        <Pressable style={styles.cta} onPress={() => router.push('/(auth)/phone')}>
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary, padding: Spacing.xl, justifyContent: 'space-between' },
  brandWrap: { alignItems: 'center', marginTop: Spacing['4xl'] },
  logo: { width: 220, height: 110, marginBottom: Spacing.md },
  tagline: { fontSize: 15, color: Colors.text.secondary, marginTop: Spacing.sm, textAlign: 'center' },
  langSection: { gap: Spacing.md, marginBottom: Spacing.lg },
  langTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.secondary, marginBottom: Spacing.sm },
  langBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border.light, borderRadius: BorderRadius.lg,
    paddingVertical: 14, paddingHorizontal: Spacing.base, backgroundColor: Colors.background.primary,
  },
  langBtnSelected: { borderColor: Colors.brand.primary, backgroundColor: '#F1FAF4' },
  langText: { fontSize: 16, color: Colors.text.primary, fontWeight: '500' },
  langTextSelected: { color: Colors.brand.primary, fontWeight: '700' },
  check: { color: Colors.brand.primary, fontSize: 18, fontWeight: '700' },
  cta: {
    backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
