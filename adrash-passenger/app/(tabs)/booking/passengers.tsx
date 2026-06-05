// app/(tabs)/booking/passengers.tsx
// Collect full name, phone, next-of-kin name + phone for each booked seat.
// All fields are required and validated before advancing to summary.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import { bookingService } from '@/features/passenger-booking/services/bookingService';
import type { PassengerDetailDTO } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Single passenger card ────────────────────────────────────────────────────

interface PassengerCardProps {
    index:    number;
    seat:     number;
    data:     PassengerDetailDTO;
    onChange: (field: keyof PassengerDetailDTO, value: string) => void;
    error:    string | null;
}

function PassengerCard({ index, seat, data, onChange, error }: PassengerCardProps) {
    const { t } = useTranslation();

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>
                {t('booking.passengers.seat_label', { number: seat })}
            </Text>

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('booking.passengers.name_placeholder')}</Text>
                <TextInput
                    style={styles.input}
                    value={data.fullName}
                    onChangeText={(v) => onChange('fullName', v)}
                    placeholder={t('booking.passengers.name_placeholder')}
                    placeholderTextColor={Colors.text.disabled}
                    autoCapitalize="words"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('booking.passengers.phone_label')}</Text>
                <TextInput
                    style={styles.input}
                    value={data.phone}
                    onChangeText={(v) => onChange('phone', v)}
                    placeholder="09XX XXX XXX  or  +251 9XX XXX XXX"
                    placeholderTextColor={Colors.text.disabled}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    maxLength={15}
                />
                <Text style={styles.phoneHint}>Ethio Telecom (09XX) · Safaricom (07XX)</Text>
            </View>

            <View style={styles.kinDivider}>
                <Text style={styles.kinLabel}>🆘 Emergency contact</Text>
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('booking.passengers.next_of_kin_name')}</Text>
                <TextInput
                    style={styles.input}
                    value={data.nextOfKinName}
                    onChangeText={(v) => onChange('nextOfKinName', v)}
                    placeholder={t('booking.passengers.next_of_kin_name')}
                    placeholderTextColor={Colors.text.disabled}
                    autoCapitalize="words"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('booking.passengers.next_of_kin_phone')}</Text>
                <TextInput
                    style={styles.input}
                    value={data.nextOfKinPhone}
                    onChangeText={(v) => onChange('nextOfKinPhone', v)}
                    placeholder="09XX XXX XXX  or  +251 9XX XXX XXX"
                    placeholderTextColor={Colors.text.disabled}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    maxLength={15}
                />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PassengersScreen() {
    const { t } = useTranslation();
    const { selectedSeats, passengerDetails, setPassengers } = useBookingFlowStore();

    const blank: PassengerDetailDTO = {
        fullName: '', phone: '', nextOfKinName: '', nextOfKinPhone: '',
    };

    const passengers: PassengerDetailDTO[] = selectedSeats.map(
        (_, i) => passengerDetails[i] ?? blank,
    );

    const [errors, setErrors] = useState<(string | null)[]>(
        selectedSeats.map(() => null),
    );

    function update(index: number, field: keyof PassengerDetailDTO, value: string) {
        const next = passengers.map((p, i) =>
            i === index ? { ...p, [field]: value } : p,
        );
        setPassengers(next);
        // Clear inline error for this passenger when user edits
        setErrors((e) => e.map((err, i) => (i === index ? null : err)));
    }

    function handleNext() {
        const nextErrors = passengers.map((p) => bookingService.validatePassenger(p));
        setErrors(nextErrors);
        if (nextErrors.some(Boolean)) return;
        router.push('/(tabs)/booking/summary');
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.backText}>←</Text>
                    </Pressable>
                    <Text style={styles.title}>{t('booking.passengers.title')}</Text>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    {selectedSeats.map((seat, i) => (
                        <PassengerCard
                            key={seat}
                            index={i}
                            seat={seat}
                            data={passengers[i] ?? blank}
                            onChange={(field, value) => update(i, field, value)}
                            error={errors[i] ?? null}
                        />
                    ))}

                    <Pressable style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.nextBtnText}>{t('booking.passengers.continue')}</Text>
                    </Pressable>

                    <View style={{ height: Spacing.xl }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    backBtn:  { padding: 4 },
    backText: { fontSize: 22, color: Colors.text.primary, fontWeight: '600' },
    title:    { fontSize: 20, fontWeight: '900', color: Colors.text.primary },
    content:  { padding: Spacing.lg, gap: Spacing.md },
    card: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        gap: Spacing.sm,
        ...Shadow.sm,
    },
    cardTitle:  { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
    fieldGroup: { gap: 5 },
    fieldLabel: {
        fontSize: 11, fontWeight: '700',
        color: Colors.text.tertiary, letterSpacing: 0.4,
    },
    input: {
        borderWidth: 1.5,
        borderColor: Colors.border.medium,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        fontSize: 15,
        color: Colors.text.primary,
        backgroundColor: Colors.background.secondary,
    },
    kinDivider: {
        borderTopWidth: 1,
        borderTopColor: Colors.border.light,
        paddingTop: Spacing.sm,
        marginTop: Spacing.xs,
    },
    kinLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.tertiary },
    phoneHint: {
        fontSize: 11,
        color: Colors.text.disabled,
        marginTop: 3,
    },
    error: {
        color: Colors.semantic.error,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    nextBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 15,
        alignItems: 'center',
        ...Shadow.sm,
    },
    nextBtnText: { color: Colors.neutral.white, fontWeight: '800', fontSize: 16 },
});
