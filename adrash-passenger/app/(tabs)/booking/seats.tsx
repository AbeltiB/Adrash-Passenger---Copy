// app/(tabs)/booking/seats.tsx
// Seat map. Loads real booked/available data from GET /trips/{id}/seats.
// If the API returns an empty array (e.g. newly scheduled trip with no seat
// records yet), falls back to generating all seats from the bus capacity —
// every seat shown as available so the passenger can still select.

import { useMemo } from 'react';
import { router } from 'expo-router';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { PrimaryButton, StateView } from '@/features/passenger-booking/components/BookingUi';
import { useSeats } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import type { SeatDTO } from '@/features/passenger-booking/dtos/bookingDtos';

// ─── Seat button ──────────────────────────────────────────────────────────────

function SeatBtn({
    seat,
    selected,
    onPress,
}: {
    seat: SeatDTO;
    selected: boolean;
    onPress: () => void;
}) {
    const state = seat.isBooked ? 'booked' : selected ? 'selected' : 'free';
    return (
        <Pressable
            style={[styles.seat, styles[state]]}
            onPress={onPress}
            disabled={seat.isBooked}
            accessibilityRole="button"
            accessibilityLabel={`Seat ${seat.seatNumber}${seat.isBooked ? ', booked' : selected ? ', selected' : ', available'}`}
            accessibilityState={{ selected, disabled: seat.isBooked }}
        >
            <Text style={[styles.seatNum, (selected || seat.isBooked) && styles.seatNumLight]}>
                {seat.seatNumber}
            </Text>
        </Pressable>
    );
}

// ─── Bus layout ───────────────────────────────────────────────────────────────
// Renders seats in a 2-aisle-2 column layout (standard Ethiopian minibus/coach).
// Seat numbers go left-to-right, front-to-back.

function BusLayout({
    seats,
    selectedSeats,
    onToggle,
}: {
    seats: SeatDTO[];
    selectedSeats: number[];
    onToggle: (n: number, booked: boolean) => void;
}) {
    // Group into rows of 4: [left1, left2, right1, right2]
    // Odd seats on the left, even on the right — or simply sequential 4-per-row.
    const rows: SeatDTO[][] = [];
    for (let i = 0; i < seats.length; i += 4) {
        rows.push(seats.slice(i, i + 4));
    }

    return (
        <View style={styles.busBody}>
            {/* Driver row indicator */}
            <View style={styles.driverRow}>
                <View style={styles.steeringWrap}>
                    <Text style={styles.steeringIcon}>🚌</Text>
                </View>
            </View>

            <View style={styles.seatsArea}>
                {rows.map((row, ri) => (
                    <View key={ri} style={styles.seatRow}>
                        {/* Left pair */}
                        <View style={styles.seatPair}>
                            {row[0] && (
                                <SeatBtn
                                    seat={row[0]}
                                    selected={selectedSeats.includes(row[0].seatNumber)}
                                    onPress={() => onToggle(row[0].seatNumber, row[0].isBooked)}
                                />
                            )}
                            {row[1] && (
                                <SeatBtn
                                    seat={row[1]}
                                    selected={selectedSeats.includes(row[1].seatNumber)}
                                    onPress={() => onToggle(row[1].seatNumber, row[1].isBooked)}
                                />
                            )}
                        </View>

                        {/* Aisle */}
                        <View style={styles.aisle} />

                        {/* Right pair */}
                        <View style={styles.seatPair}>
                            {row[2] && (
                                <SeatBtn
                                    seat={row[2]}
                                    selected={selectedSeats.includes(row[2].seatNumber)}
                                    onPress={() => onToggle(row[2].seatNumber, row[2].isBooked)}
                                />
                            )}
                            {row[3] && (
                                <SeatBtn
                                    seat={row[3]}
                                    selected={selectedSeats.includes(row[3].seatNumber)}
                                    onPress={() => onToggle(row[3].seatNumber, row[3].isBooked)}
                                />
                            )}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SeatsScreen() {
    const f = useBookingFlowStore();
    const q = useSeats(f.selectedTrip?.id);

    // If the API returns seats, use them.
    // If empty (new trip / no records provisioned yet), generate all seats from
    // bus capacity — all shown as available so the passenger can still select.
    const apiSeats = q.data ?? [];
    const capacity = f.selectedTrip?.bus?.capacity ?? f.selectedTrip?.totalSeats ?? 0;

    const seats: SeatDTO[] = useMemo(() => {
        if (apiSeats.length > 0) return apiSeats;
        if (capacity > 0) {
            return Array.from({ length: capacity }, (_, i) => ({
                seatNumber: i + 1,
                isBooked:   false,
            }));
        }
        return [];
    }, [apiSeats, capacity]);

    const availableCount = seats.filter((s) => !s.isBooked).length;
    const bookedCount    = seats.filter((s) => s.isBooked).length;

    function toggle(n: number, booked: boolean) {
        if (booked) return;
        const selected = f.selectedSeats.includes(n);
        const next = selected
            ? f.selectedSeats.filter((s) => s !== n)
            : f.selectedSeats.length >= f.passengersCount
                ? f.selectedSeats
                : [...f.selectedSeats, n];
        f.setSeats(next);
    }

    const canContinue = f.selectedSeats.length === f.passengersCount;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Choose seats</Text>
                    <Text style={styles.sub}>
                        Select {f.passengersCount} seat{f.passengersCount !== 1 ? 's' : ''} · Refreshes every 30s
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {q.isLoading ? (
                    <StateView title="Loading seat map…" loading />
                ) : q.isError ? (
                    <StateView
                        title="Could not load seats"
                        actionLabel="Retry"
                        onAction={() => void q.refetch()}
                    />
                ) : seats.length === 0 ? (
                    <StateView
                        title="No seat data available"
                        subtitle="The seat map for this trip hasn't been set up yet."
                    />
                ) : (
                    <>
                        {/* Stats bar */}
                        <View style={styles.statsBar}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNum}>{availableCount}</Text>
                                <Text style={styles.statLabel}>Available</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statNum, { color: Colors.brand.primary }]}>
                                    {f.selectedSeats.length}
                                </Text>
                                <Text style={styles.statLabel}>Selected</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statNum, { color: Colors.semantic.error }]}>
                                    {bookedCount}
                                </Text>
                                <Text style={styles.statLabel}>Booked</Text>
                            </View>
                        </View>

                        {/* Seat map */}
                        <BusLayout
                            seats={seats}
                            selectedSeats={f.selectedSeats}
                            onToggle={toggle}
                        />

                        {/* Legend */}
                        <View style={styles.legend}>
                            {[
                                { style: styles.free,     label: 'Available' },
                                { style: styles.selected, label: 'Selected'  },
                                { style: styles.booked,   label: 'Booked'    },
                            ].map(({ style, label }) => (
                                <View key={label} style={styles.legendItem}>
                                    <View style={[styles.legendDot, style]} />
                                    <Text style={styles.legendText}>{label}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Selection status */}
                {seats.length > 0 && (
                    <View style={styles.selectionStatus}>
                        <Text style={styles.selectionText}>
                            {f.selectedSeats.length === 0
                                ? `Tap a seat to select (need ${f.passengersCount})`
                                : f.selectedSeats.length < f.passengersCount
                                    ? `${f.selectedSeats.length} of ${f.passengersCount} selected — pick ${f.passengersCount - f.selectedSeats.length} more`
                                    : `Seats ${f.selectedSeats.sort((a, b) => a - b).join(', ')} selected`}
                        </Text>
                    </View>
                )}

                <PrimaryButton
                    disabled={!canContinue}
                    onPress={() => router.push('/(tabs)/booking/passengers')}
                >
                    Continue
                </PrimaryButton>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SEAT_SIZE = 48;

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
    title:    { fontWeight: '800', fontSize: 16, color: Colors.text.primary },
    sub:      { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },

    content: { padding: Spacing.lg, gap: Spacing.md },

    statsBar: {
        flexDirection: 'row',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        justifyContent: 'space-around',
        ...Shadow.sm,
    },
    statItem:  { alignItems: 'center', gap: 2 },
    statNum:   { fontSize: 20, fontWeight: '900', color: Colors.text.primary },
    statLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },

    // Bus body
    busBody: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        ...Shadow.md,
    },
    driverRow: {
        backgroundColor: Colors.brand.primaryTint,
        paddingVertical: Spacing.sm,
        alignItems: 'flex-end',
        paddingRight: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    steeringWrap: { alignItems: 'center' },
    steeringIcon: { fontSize: 20 },

    seatsArea: { padding: Spacing.md, gap: Spacing.sm },
    seatRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    seatPair:  { flexDirection: 'row', gap: Spacing.xs },
    aisle:     { width: 28 },

    // Individual seat
    seat: {
        width: SEAT_SIZE,
        height: SEAT_SIZE,
        borderRadius: BorderRadius.sm,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    free: {
        backgroundColor: Colors.seat.available,
        borderColor:     Colors.seat.availableBorder,
    },
    selected: {
        backgroundColor: Colors.seat.selected,
        borderColor:     Colors.seat.selected,
    },
    booked: {
        backgroundColor: Colors.seat.occupied,
        borderColor:     Colors.seat.occupiedBorder,
    },
    seatNum:       { fontSize: 13, fontWeight: '800', color: Colors.text.primary },
    seatNumLight:  { color: Colors.neutral.white },

    // Legend
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.xl,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    legendDot:  { width: 16, height: 16, borderRadius: BorderRadius.sm, borderWidth: 2 },
    legendText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },

    selectionStatus: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        ...Shadow.sm,
    },
    selectionText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
