// app/(tabs)/index.tsx
// Home / search screen.
// Avatar in the top-right corner opens a small popover with
// "View Profile" and "Logout" actions.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ADRASH_LOGO from '../../assets/Logo Adrash one.png';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { Field, StateView } from '@/features/passenger-booking/components/BookingUi';
import { DateTimePicker } from '@/features/passenger-booking/components/DateTimePicker';
import { useRoutes } from '@/features/passenger-booking/hooks/usePassengerBooking';
import { useBookingFlowStore } from '@/features/passenger-booking/store/bookingFlowStore';
import { routeService } from '@/features/passenger-booking/services/routeService';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useProfile } from '@/features/profile/hooks/useProfile';

// ─── Avatar menu ──────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
    if (!name) return '';
    return name.trim().split(/\s+/).map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function AvatarMenu() {
    const [visible, setVisible] = useState(false);
    const user = useAuthStore((s) => s.user);
    const { data: profile } = useProfile();
    const { mutate: logout, isPending } = useLogout();

    const fullName = profile?.fullName
        ?? (user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : null);
    const initials = getInitials(fullName);
    const hasInitials = initials.length > 0;
    const displayName = fullName ?? 'My Account';
    const displayPhone = profile?.phone ?? user?.phoneNumber ?? null;

    return (
        <>
            <Pressable
                style={styles.avatar}
                onPress={() => setVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Account menu"
            >
                <Text style={styles.avatarText}>{hasInitials ? initials : '?'}</Text>
            </Pressable>

            {/* Popover modal — renders over everything, closes on backdrop tap */}
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
                    {/* Stop propagation so tapping inside the menu doesn't close it */}
                    <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
                        {/* User info header */}
                        <View style={styles.menuHeader}>
                            <View style={styles.menuAvatar}>
                                <Text style={styles.menuAvatarText}>{initials}</Text>
                            </View>
                            <View>
                                <Text style={styles.menuName}>{displayName}</Text>
                                {displayPhone ? (
                                    <Text style={styles.menuPhone}>{displayPhone}</Text>
                                ) : null}
                            </View>
                        </View>

                        <View style={styles.menuDivider} />

                        {/* View Profile */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setVisible(false);
                                router.push('/(tabs)/profile');
                            }}
                        >
                            <Text style={styles.menuItemIcon}>👤</Text>
                            <Text style={styles.menuItemText}>View Profile</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        {/* Logout */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setVisible(false);
                                logout();
                            }}
                            disabled={isPending}
                        >
                            <Text style={styles.menuItemIcon}>🚪</Text>
                            <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                                {isPending ? 'Logging out…' : 'Logout'}
                            </Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

// ─── Home tab ─────────────────────────────────────────────────────────────────

export default function HomeTab() {
    const { t } = useTranslation();
    const {
        origin, destination, date, time, passengersCount,
        recentSearches, setSearch, swap, rememberSearch, selectRoute,
    } = useBookingFlowStore();

    const [query, setQuery] = useState('');
    const routesQuery = useRoutes();
    const routes = useMemo(
        () => routesQuery.data?.pages.flatMap((p) => p.items) ?? [],
        [routesQuery.data],
    );
    const filteredRoutes = useMemo(
        () => routeService.filter(routes, origin || query, destination).slice(0, 8),
        [routes, origin, destination, query],
    );
    const cities = useMemo(
        () =>
            Array.from(new Set(routes.flatMap((r) => [r.originCity, r.destinationCity])))
                .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 8),
        [routes, query],
    );

    const search = () => { rememberSearch(); router.push('/(tabs)/search/results'); };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Image source={ADRASH_LOGO} style={styles.logo} resizeMode="contain" />
                    <View style={styles.headerRight}>
                        <Pressable
                            style={styles.iconBtn}
                            onPress={() => router.push('/(tabs)/notifications')}
                            accessibilityLabel="Notifications"
                        >
                            <Text>🔔</Text>
                        </Pressable>
                        <AvatarMenu />
                    </View>
                </View>

                <Text style={styles.greeting}>{t('home.greeting')}</Text>
                <Text style={styles.greetingSub}>{t('home.greeting_sub')}</Text>

                {/* ── Search card ── */}
                <View style={styles.searchCard}>
                    <Field
                        label={t('home.search_city')}
                        value={query}
                        onChangeText={setQuery}
                        placeholder={t('home.search_city_placeholder')}
                    />
                    <View style={styles.chips}>
                        {cities.map((city) => (
                            <Pressable
                                key={city}
                                style={styles.chip}
                                onPress={() =>
                                    setSearch(origin ? { destination: city } : { origin: city })
                                }
                            >
                                <Text style={styles.chipText}>{city}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Field
                        label={t('home.from')}
                        value={origin}
                        onChangeText={(v) => setSearch({ origin: v })}
                        placeholder={t('home.from')}
                    />
                    <Pressable style={styles.swap} onPress={swap}>
                        <Text style={styles.swapIcon}>⇅</Text>
                    </Pressable>
                    <Field
                        label={t('home.to')}
                        value={destination}
                        onChangeText={(v) => setSearch({ destination: v })}
                        placeholder={t('home.to')}
                    />

                    <DateTimePicker
                        date={date}
                        time={time}
                        onChange={(d, tm) => setSearch({ date: d, time: tm })}
                    />
                    <Field
                        label={t('home.passengers')}
                        value={String(passengersCount)}
                        onChangeText={(v) =>
                            setSearch({ passengersCount: Math.max(1, Number(v) || 1) })
                        }
                        keyboardType="numeric"
                    />

                    <Pressable
                        style={[
                            styles.searchBtn,
                            (!origin || !destination || origin === destination) && styles.disabled,
                        ]}
                        disabled={!origin || !destination || origin === destination}
                        onPress={search}
                    >
                        <Text style={styles.searchBtnText}>{t('home.search_trips')}</Text>
                    </Pressable>

                    {origin === destination && origin ? (
                        <Text style={styles.error}>{t('home.origin_destination_same')}</Text>
                    ) : null}
                </View>

                {/* ── Matching routes ── */}
                <Text style={styles.sectionTitle}>{t('home.matching_routes')}</Text>
                {routesQuery.isLoading ? (
                    <StateView title={t('home.loading_routes')} loading />
                ) : routesQuery.isError ? (
                    <StateView
                        title={t('home.could_not_load')}
                        subtitle={t('home.check_connection')}
                        actionLabel={t('common.retry')}
                        onAction={() => void routesQuery.refetch()}
                    />
                ) : filteredRoutes.length === 0 ? (
                    <StateView title={t('home.no_results')} subtitle={t('home.no_results_sub')} />
                ) : (
                    filteredRoutes.map((r) => (
                        <Pressable
                            key={r.id}
                            style={styles.popularCard}
                            onPress={() => {
                                selectRoute(r);
                                setSearch({ origin: r.originCity, destination: r.destinationCity });
                                router.push('/(tabs)/search/results');
                            }}
                        >
                            <View>
                                <Text style={styles.popularRoute}>
                                    {r.originCity} → {r.destinationCity}
                                </Text>
                                <Text style={styles.popularSub}>
                                    {r.distanceKm} km · {Math.round(r.estimatedDurationMin / 60)}h{' '}
                                    {r.estimatedDurationMin % 60}m
                                </Text>
                            </View>
                            <Text style={styles.chev}>›</Text>
                        </Pressable>
                    ))
                )}

                {/* ── Recent searches ── */}
                <Text style={styles.sectionTitle}>{t('home.recent_searches')}</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentRow}
                >
                    {recentSearches.map((r, i) => (
                        <Pressable
                            key={`${r.origin}-${r.destination}-${i}`}
                            style={styles.recentCard}
                            onPress={() => {
                                setSearch(r);
                                router.push('/(tabs)/search/results');
                            }}
                        >
                            <Text style={styles.recentRoute}>
                                {r.origin} → {r.destination}
                            </Text>
                            <Text style={styles.recentDate}>{r.date}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:    { flex: 1, backgroundColor: Colors.background.secondary },
    scroll:       { padding: Spacing.lg, gap: Spacing.md },
    header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo:         { width: 100, height: 36 },
    headerRight:  { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    iconBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.brand.primaryTint,
        borderWidth: 1, borderColor: Colors.border.light,
        alignItems: 'center', justifyContent: 'center',
    },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Popover modal
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'flex-end',
        paddingTop: 80,          // push below the header
        paddingRight: Spacing.lg,
    },
    menu: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        minWidth: 220,
        ...Shadow.lg,
        overflow: 'hidden',
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
    },
    menuAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    menuAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    menuName:       { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
    menuPhone:      { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
    menuDivider:    { height: 1, backgroundColor: Colors.border.light },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    menuItemIcon:   { fontSize: 18, width: 24, textAlign: 'center' },
    menuItemText:   { fontSize: 15, color: Colors.text.primary, fontWeight: '500' },
    menuItemDanger: { color: Colors.semantic.error },

    // Search
    greeting:     { fontSize: 24, fontWeight: '900', color: Colors.text.primary, marginTop: Spacing.sm },
    greetingSub:  { fontSize: 14, color: Colors.text.tertiary },
    searchCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        gap: Spacing.sm,
        ...Shadow.md,
    },
    swap: {
        alignSelf: 'center', width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
        marginVertical: -2,
    },
    swapIcon:      { color: '#fff', fontSize: 18, fontWeight: '700' },
    searchBtn: {
        backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 14, alignItems: 'center', marginTop: Spacing.xs,
    },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    disabled:      { opacity: 0.4 },
    error:         { color: Colors.semantic.error, fontWeight: '700' },
    sectionTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: Spacing.md },
    chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        backgroundColor: Colors.semantic.infoLight,
        paddingHorizontal: Spacing.md, paddingVertical: 7,
        borderRadius: BorderRadius.full,
    },
    chipText:      { color: Colors.semantic.info, fontWeight: '700' },
    popularCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg,
        padding: Spacing.md, ...Shadow.sm,
    },
    popularRoute:  { fontWeight: '800', color: Colors.text.primary, fontSize: 15 },
    popularSub:    { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
    chev:          { fontSize: 24, color: Colors.text.tertiary },
    recentRow:     { gap: Spacing.sm, paddingVertical: 4 },
    recentCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        width: 220,
        ...Shadow.sm,
    },
    recentRoute:   { fontWeight: '700', color: Colors.text.primary },
    recentDate:    { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
});