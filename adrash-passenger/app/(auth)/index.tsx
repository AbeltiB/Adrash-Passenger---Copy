import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../src/components/layout/ScreenWrapper';
import { Colors, Spacing, BorderRadius } from '../../src/constants';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../../src/lib/i18n';
import { useAuthStore } from '../../src/features/auth/store/authStore';
import type { Language } from '../../src/types';

export default function SplashScreen() {
  const { t } = useTranslation();
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const preferredLanguage = useAuthStore((s) => s.preferredLanguage);
  // Track which button is currently switching so we can show a loading indicator
  const [switching, setSwitching] = useState<Language | null>(null);

  async function handleSelectLanguage(lang: Language) {
    if (switching) return; // prevent double-tap during transition
    setSwitching(lang);

    // 1. Persist to MMKV and Zustand so every screen picks it up
    setLanguage(lang);

    // 2. Await the i18n switch — this ensures all useTranslation() hooks
    //    re-render with the new language BEFORE the next screen mounts.
    //    Without await, the agreement screen would still render in English.
    await changeLanguage(lang);

    setSwitching(null);
    router.replace('/(auth)/agreement');
  }

  return (
    <ScreenWrapper backgroundColor={Colors.primary} padded={false}>
      <View style={styles.container}>
        {/* Logo area */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>አድ</Text>
          </View>
          <Text style={styles.appNameAmharic}>አድራሽ</Text>
          <Text style={styles.appNameEnglish}>ADRASH</Text>
          <Text style={styles.tagline}>{t('screen.splash.tagline')}</Text>
        </View>

        {/* Language selector */}
        <View style={styles.languageSection}>
          <Text style={styles.selectLabel}>{t('screen.splash.selectLanguage')}</Text>
          <View style={styles.languageButtons}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = preferredLanguage === lang.code;
              const isLoading = switching === lang.code;

              return (
                <Pressable
                  key={lang.code}
                  style={({ pressed }) => [
                    styles.languageButton,
                    isActive && styles.languageButtonActive,
                    pressed && !switching && styles.languageButtonPressed,
                    switching && !isLoading && styles.languageButtonDimmed,
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                  disabled={switching !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${lang.label}`}
                  accessibilityState={{ selected: isActive, busy: isLoading }}
                >
                  {isLoading ? (
                    <ActivityIndicator color={isActive ? Colors.primary : Colors.white} />
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.languageButtonText,
                          isActive && styles.languageButtonTextActive,
                        ]}
                      >
                        {lang.nativeLabel}
                      </Text>
                      <Text
                        style={[
                          styles.languageButtonSubtext,
                          isActive && styles.languageButtonTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 60,
  },
  logoSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.white,
  },
  appNameAmharic: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 2,
  },
  appNameEnglish: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 6,
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  languageSection: {
    gap: Spacing.md,
  },
  selectLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  languageButtons: {
    gap: Spacing.sm,
  },
  languageButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 64,
    justifyContent: 'center',
  },
  languageButtonActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  languageButtonPressed: {
    opacity: 0.8,
  },
  // Dim other buttons while one is switching so double-tap is obvious
  languageButtonDimmed: {
    opacity: 0.4,
  },
  languageButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  languageButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  languageButtonTextActive: {
    color: Colors.primary,
  },
});