// app/(tabs)/booking/passengers.tsx
// Collect each passenger's full name + phone. The emergency contact defaults to
// the same person (collapsed) and can be expanded and overridden if needed.

import { useMemo, useState } from 'react';
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
import { formatLocalPhone, sanitizeLocalPhone } from '@/lib/phone';
import type { PassengerDetailDTO } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Phone input with a fixed +251 prefix ──────────────────────────────────────

function PhoneField({
    value,
    onChangeText,
    editable = true,
}: {
    value: string;
    onChangeText: (digits: string) => void;
    editable?: boolean;
}) {
    return (
        <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
                <Text style={styles.prefixFlag}>🇪🇹</Text>
                <Text style={styles.prefixText}>+251</Text>
            </View>
            <TextInput
                style={[styles.input, styles.phoneInput, !editable && styles.inputDisabled]}
                value={formatLocalPhone(value)}
                onChangeText={(v) => onChangeText(sanitizeLocalPhone(v))}
                placeholder="9XX XXX XXX"
                placeholderTextColor={Colors.text.disabled}
                keyboardType="phone-pad"
                autoCorrect={false}
                maxLength={11}
                editable={editable}
            />
        </View>
    );
}

// ─── Single passenger card ────────────────────────────────────────────────────

interface PassengerCardProps {
    seat:           number;
    data:           PassengerDetailDTO;
    expanded:       boolean;
    kinCustom:      boolean;
    onChangePassenger: (field: 'fullName' | 'phone', value: string) => void;
    onChangeKin:    (field: 'nextOfKinName' | 'nextOfKinPhone', value: string) => void;
    onToggleExpand: () => void;
    onResetKin:     () => void;
    error:          string | null;
}

function PassengerCard({
    seat, data, expanded, kinCustom,
    onChangePassenger, onChangeKin, onToggleExpand, onResetKin, error,
}: PassengerCardProps) {
    const { t } = useTranslation();

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>
                {t('booking.passengers.seat_label', { number: seat })}
            </Text>

            {/* Full name */}
            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('booking.passengers.name_placeholder')}</Text>
                <TextInput
                    style={styles.input}
                    value={data.fullName}
                    onChangeText={(v) => onChangePassenger('fullName', v)}
                    placeholder={t('booking.passengers.name_placeholder')}
                    placeholderTextColor={Colors.text.disabled}
                    autoCapitalize="words"
                    autoCorrect={false}
                />
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('booking.passengers.phone_label')}</Text>
                <PhoneField
                    value={data.phone}
                    onChangeText={(v) => onChangePassenger('phone', v)}
                />
            </View>

            {/* Emergency contact — collapsed, mirrors the passenger by default */}
            <Pressable style={styles.kinHeader} onPress={onToggleExpand}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.kinHeaderText}>🆘 Emergency contact</Text>
                    {!expanded && (
                        <Text style={styles.kinSubtitle}>
                            {kinCustom
                                ? `${data.nextOfKinName || '—'} · +251 ${formatLocalPhone(data.nextOfKinPhone)}`
                                : 'Same as passenger'}
                        </Text>
                    )}
                </View>
                <Text style={styles.kinChevron}>{expanded ? '▴' : '▾'}</Text>
            </Pressable>

            {expanded && (
                <View style={styles.kinBody}>
                    {!kinCustom && (
                        <Text style={styles.kinHint}>
                            Using the passenger&apos;s name and phone. Edit below to use a
                            different contact.
                        </Text>
                    )}

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>{t('booking.passengers.next_of_kin_name')}</Text>
                        <TextInput
                            style={styles.input}
                            value={data.nextOfKinName}
                            onChangeText={(v) => onChangeKin('nextOfKinName', v)}
                            placeholder={t('booking.passengers.next_of_kin_name')}
                            placeholderTextColor={Colors.text.disabled}
                            autoCapitalize="words"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>{t('booking.passengers.next_of_kin_phone')}</Text>
                        <PhoneField
                            value={data.nextOfKinPhone}
                            onChangeText={(v) => onChangeKin('nextOfKinPhone', v)}
                        />
                    </View>

                    {kinCustom && (
                        <Pressable style={styles.resetKin} onPress={onResetKin}>
                            <Text style={styles.resetKinText}>↺ Use same as passenger</Text>
                        </Pressable>
                    )}
                </View>
            )}

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

    // Per-passenger UI state: whether the emergency-contact section is expanded,
    // and whether the user has overridden it (vs. mirroring the passenger).
    const [expanded, setExpanded] = useState<boolean[]>(() => selectedSeats.map(() => false));
    const [kinCustom, setKinCustom] = useState<boolean[]>(() =>
        selectedSeats.map((_, i) => {
            const p = passengerDetails[i];
            // Treat pre-existing data as custom only if the kin differs from passenger.
            return Boolean(
                p &&
                (p.nextOfKinName || p.nextOfKinPhone) &&
                (p.nextOfKinName !== p.fullName || p.nextOfKinPhone !== p.phone),
            );
        }),
    );
    const [errors, setErrors] = useState<(string | null)[]>(() => selectedSeats.map(() => null));

    function writePassengers(next: PassengerDetailDTO[]) {
        setPassengers(next);
    }

    // Update the passenger's own name/phone. When the emergency contact is still
    // mirroring (not custom), keep it in sync automatically.
    function changePassenger(index: number, field: 'fullName' | 'phone', value: string) {
        const next = passengers.map((p, i) => {
            if (i !== index) return p;
            const updated = { ...p, [field]: value };
            if (!kinCustom[index]) {
                updated.nextOfKinName  = updated.fullName;
                updated.nextOfKinPhone = updated.phone;
            }
            return updated;
        });
        writePassengers(next);
        setErrors((e) => e.map((err, i) => (i === index ? null : err)));
    }

    // Editing a kin field marks it as a custom contact and stops mirroring.
    function changeKin(index: number, field: 'nextOfKinName' | 'nextOfKinPhone', value: string) {
        if (!kinCustom[index]) {
            setKinCustom((k) => k.map((v, i) => (i === index ? true : v)));
        }
        const next = passengers.map((p, i) =>
            i === index ? { ...p, [field]: value } : p,
        );
        writePassengers(next);
        setErrors((e) => e.map((err, i) => (i === index ? null : err)));
    }

    function resetKin(index: number) {
        setKinCustom((k) => k.map((v, i) => (i === index ? false : v)));
        const next = passengers.map((p, i) =>
            i === index ? { ...p, nextOfKinName: p.fullName, nextOfKinPhone: p.phone } : p,
        );
        writePassengers(next);
    }

    function toggleExpand(index: number) {
        setExpanded((e) => e.map((v, i) => (i === index ? !v : v)));
    }

    function handleNext() {
        // Make sure any still-mirroring contacts carry the latest passenger data.
        const synced = passengers.map((p, i) =>
            kinCustom[i] ? p : { ...p, nextOfKinName: p.fullName, nextOfKinPhone: p.phone },
        );
        writePassengers(synced);

        const nextErrors = synced.map((p) => bookingService.validatePassenger(p));
        setErrors(nextErrors);
        if (nextErrors.some(Boolean)) return;
        router.push('/(tabs)/booking/summary');
    }

    // Keep the local state arrays sized to the seat count.
    const cards = useMemo(
        () => selectedSeats.map((seat, i) => ({ seat, data: passengers[i] ?? blank })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedSeats, passengerDetails],
    );

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
                    {cards.map(({ seat, data }, i) => (
                        <PassengerCard
                            key={seat}
                            seat={seat}
                            data={data}
                            expanded={expanded[i] ?? false}
                            kinCustom={kinCustom[i] ?? false}
                            onChangePassenger={(field, value) => changePassenger(i, field, value)}
                            onChangeKin={(field, value) => changeKin(i, field, value)}
                            onToggleExpand={() => toggleExpand(i)}
                            onResetKin={() => resetKin(i)}
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
    inputDisabled: { opacity: 0.6 },

    // Phone with +251 prefix
    phoneRow:   { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    prefixBox: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: Spacing.md, paddingVertical: 12,
        borderWidth: 1.5, borderColor: Colors.border.medium,
        borderRadius: BorderRadius.lg, backgroundColor: Colors.background.secondary,
    },
    prefixFlag: { fontSize: 16 },
    prefixText: { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
    phoneInput: { flex: 1 },

    // Emergency contact collapsible
    kinHeader: {
        flexDirection: 'row', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: Colors.border.light,
        paddingTop: Spacing.sm, marginTop: Spacing.xs,
    },
    kinHeaderText: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
    kinSubtitle:   { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
    kinChevron:    { fontSize: 16, color: Colors.text.tertiary, paddingHorizontal: Spacing.sm },
    kinBody:       { gap: Spacing.sm, marginTop: Spacing.xs },
    kinHint:       { fontSize: 12, color: Colors.text.tertiary, lineHeight: 17 },
    resetKin:      { alignSelf: 'flex-start', paddingVertical: 4 },
    resetKinText:  { color: Colors.brand.primary, fontWeight: '700', fontSize: 13 },

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
