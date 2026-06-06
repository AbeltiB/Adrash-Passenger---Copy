// Shared auth layout: a brand-blue hero (logo + title + subtitle) with a white
// rounded card overlapping it. Used across the login/onboarding screens so they
// share one consistent, on-brand look.

import type { ReactNode } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ADRASH_LOGO from '../../../../assets/Logo Adrash one.png';
import { Colors, Spacing, BorderRadius } from '../../../constants';

interface AuthHeroProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    showBack?: boolean;
    onBack?: () => void;
    /** Right-aligned header action (e.g. nothing now — reserved). */
    headerRight?: ReactNode;
}

export function AuthHero({ title, subtitle, children, showBack = false, onBack, headerRight }: AuthHeroProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>
            {/* ── Brand hero ── */}
            <View style={[styles.hero, { paddingTop: insets.top + Spacing.md }]}>
                <View style={styles.heroBar}>
                    {showBack ? (
                        <Pressable
                            style={styles.back}
                            onPress={onBack ?? (() => router.back())}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <Text style={styles.backText}>←</Text>
                        </Pressable>
                    ) : (
                        <View style={styles.back} />
                    )}
                    {headerRight ?? <View style={styles.back} />}
                </View>

                <View style={styles.logoBadge}>
                    <Image source={ADRASH_LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Adrash" />
                </View>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            {/* ── White card ── */}
            <KeyboardAvoidingView
                style={styles.cardWrap}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.card}
                    contentContainerStyle={[styles.cardContent, { paddingBottom: insets.bottom + Spacing.xl }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.brand.primary },
    hero: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing['2xl'],
        alignItems: 'center',
    },
    heroBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignSelf: 'stretch',
        marginBottom: Spacing.md,
    },
    back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    backText: { color: '#FFFFFF', fontSize: 26, fontWeight: '600' },
    logoBadge: {
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        marginBottom: Spacing.md,
    },
    logo: { width: 132, height: 36 },
    title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', textAlign: 'center' },
    subtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: Spacing.xs,
        lineHeight: 20,
    },
    cardWrap: { flex: 1 },
    card: {
        flex: 1,
        backgroundColor: Colors.background.primary,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -Spacing.lg,
    },
    cardContent: {
        padding: Spacing.xl,
        gap: Spacing.md,
        flexGrow: 1,
    },
});
