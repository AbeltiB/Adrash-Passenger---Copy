// app/reviews/[bookingId].tsx
// Post-trip review screen — 5-star rating + optional comment.
// Accessible from: completed trip detail, My Trips "Rate this trip" button.
// API: POST /reviews { bookingId, score, comment }

import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';
import {
    useSubmitReview,
    useBookingDetail,
} from '../../src/features/passenger-booking/hooks/usePassengerBooking';

// ─── Quick-fill chips ─────────────────────────────────────────────────────────

const QUICK_CHIPS = [
    'Comfortable journey',
    'Driver was professional',
    'Clean bus',
    'On time',
    'Great route',
];

// ─── Star labels ──────────────────────────────────────────────────────────────

const STAR_LABELS: Record<number, string> = {
    1: 'Poor',
    2: 'Below average',
    3: 'Average',
    4: 'Good',
    5: 'Excellent',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReviewScreen() {
    const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
    const booking   = useBookingDetail(bookingId);
    const submitMut = useSubmitReview();

    const [score,   setScore]   = useState(0);
    const [comment, setComment] = useState('');
    const [done,    setDone]    = useState(false);

    const MAX_CHARS = 300;
    const canSubmit = score > 0 && !submitMut.isPending;

    function appendChip(chip: string) {
        setComment((c) => {
            const sep = c.trim().length > 0 ? '. ' : '';
            const next = `${c.trim()}${sep}${chip}`;
            return next.length <= MAX_CHARS ? next : c;
        });
    }

    async function handleSubmit() {
        if (!bookingId || !canSubmit) return;
        await submitMut.mutateAsync({ bookingId, score, comment: comment.trim() });
        setDone(true);
    }

    // ── Success state ─────────────────────────────────────────────────────────
    if (done) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.successView}>
                    <Text style={styles.successIcon}>🌟</Text>
                    <Text style={styles.successTitle}>Thank you!</Text>
                    <Text style={styles.successSub}>
                        Your feedback helps us improve Adrash for all passengers.
                    </Text>
                    <Pressable
                        style={styles.doneBtn}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.doneBtnText}>Done</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const route    = booking.data?.trip?.route;
    const driver   = booking.data?.trip?.driver;
    const depTime  = booking.data?.trip?.departureTime
        ? new Date(booking.data.trip.departureTime).toLocaleDateString('en-ET', {
              weekday: 'short', month: 'short', day: 'numeric',
          })
        : null;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.back}>←</Text>
                    </Pressable>
                    <Text style={styles.title}>Rate your trip</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* ── Trip context ── */}
                {!booking.isLoading && route && (
                    <View style={styles.contextCard}>
                        <Text style={styles.contextRoute}>
                            {route.originCity}  →  {route.destinationCity}
                        </Text>
                        {depTime && <Text style={styles.contextDate}>{depTime}</Text>}
                        {driver && (
                            <View style={styles.driverRow}>
                                <View style={styles.driverAvatar}>
                                    <Text style={styles.driverAvatarText}>
                                        {(driver.fullName ?? driver.name ?? 'D')[0]?.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.driverName}>
                                    {driver.fullName ?? driver.name ?? 'Your driver'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Star rating ── */}
                <View style={styles.starsCard}>
                    <Text style={styles.starsPrompt}>How was your experience?</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Pressable
                                key={s}
                                onPress={() => setScore(s)}
                                style={styles.starBtn}
                                accessibilityRole="button"
                                accessibilityLabel={`${s} star${s > 1 ? 's' : ''}`}
                            >
                                <Text style={[styles.star, s <= score && styles.starFilled]}>
                                    ★
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {score > 0 && (
                        <Text style={styles.starLabel}>{STAR_LABELS[score]}</Text>
                    )}
                </View>

                {/* ── Comment ── */}
                <View style={styles.commentCard}>
                    <Text style={styles.commentLabel}>
                        Tell us about your experience{' '}
                        <Text style={styles.commentOptional}>(optional)</Text>
                    </Text>

                    {/* Quick-fill chips */}
                    <View style={styles.chips}>
                        {QUICK_CHIPS.map((chip) => (
                            <Pressable
                                key={chip}
                                style={styles.chip}
                                onPress={() => appendChip(chip)}
                            >
                                <Text style={styles.chipText}>{chip}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <TextInput
                        style={styles.commentInput}
                        value={comment}
                        onChangeText={(v) => setComment(v.slice(0, MAX_CHARS))}
                        multiline
                        numberOfLines={4}
                        placeholder="Share your thoughts…"
                        placeholderTextColor={Colors.text.disabled}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>
                        {comment.length} / {MAX_CHARS}
                    </Text>
                </View>

                {/* ── Error ── */}
                {submitMut.isError && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>
                            {submitMut.error instanceof Error
                                ? submitMut.error.message
                                : 'Could not submit review. Please try again.'}
                        </Text>
                    </View>
                )}

                {/* ── Buttons ── */}
                <Pressable
                    style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                    onPress={() => void handleSubmit()}
                    disabled={!canSubmit}
                >
                    {submitMut.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit review</Text>
                    )}
                </Pressable>

                <Pressable style={styles.skipBtn} onPress={() => router.back()}>
                    <Text style={styles.skipBtnText}>Skip for now</Text>
                </Pressable>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },
    content:   { gap: Spacing.md, paddingBottom: Spacing['2xl'] },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
        backgroundColor: Colors.background.primary,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    back:    { fontSize: 24, color: Colors.text.primary, fontWeight: '600' },
    title:   { fontSize: 17, fontWeight: '800', color: Colors.text.primary },

    contextCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.sm,
    },
    contextRoute: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
    contextDate:  { color: Colors.text.tertiary, fontSize: 13 },
    driverRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
    driverAvatar: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.brand.primaryTint,
        alignItems: 'center', justifyContent: 'center',
    },
    driverAvatarText: { fontWeight: '900', fontSize: 16, color: Colors.brand.primary },
    driverName:       { fontWeight: '600', color: Colors.text.secondary, fontSize: 13 },

    starsCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.md,
        ...Shadow.sm,
    },
    starsPrompt: { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
    starsRow:    { flexDirection: 'row', gap: Spacing.sm },
    starBtn:     { padding: 4 },
    star:        { fontSize: 44, color: Colors.neutral.gray300 },
    starFilled:  { color: '#F1C40F' },
    starLabel:   { fontWeight: '700', color: Colors.text.secondary, fontSize: 14 },

    commentCard: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.sm,
    },
    commentLabel:    { fontWeight: '700', color: Colors.text.primary, fontSize: 14 },
    commentOptional: { color: Colors.text.tertiary, fontWeight: '400' },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        backgroundColor: Colors.brand.primaryTint,
        paddingHorizontal: Spacing.md, paddingVertical: 7,
        borderRadius: BorderRadius.full,
    },
    chipText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 12 },

    commentInput: {
        borderWidth: 1, borderColor: Colors.border.medium,
        borderRadius: BorderRadius.md,
        padding: Spacing.md, fontSize: 14, color: Colors.text.primary,
        backgroundColor: Colors.background.primary,
        minHeight: 100,
    },
    charCount: { color: Colors.text.tertiary, fontSize: 11, textAlign: 'right' },

    errorBox: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.semantic.errorLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    errorText: { color: Colors.semantic.error, fontWeight: '600', fontSize: 13 },

    submitBtn: {
        marginHorizontal: Spacing.lg,
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16 },

    skipBtn:     { alignItems: 'center', padding: Spacing.md },
    skipBtnText: { color: Colors.text.tertiary, fontWeight: '600', fontSize: 14 },

    // Success state
    successView: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: Spacing.xl, gap: Spacing.md,
    },
    successIcon:  { fontSize: 64 },
    successTitle: { fontSize: 24, fontWeight: '900', color: Colors.text.primary },
    successSub:   { color: Colors.text.secondary, textAlign: 'center', fontSize: 14, lineHeight: 20 },
    doneBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg, paddingVertical: 16,
        paddingHorizontal: Spacing['2xl'], marginTop: Spacing.md,
    },
    doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
