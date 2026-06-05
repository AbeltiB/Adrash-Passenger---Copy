// app/(tabs)/index.tsx
// Home / search screen.
// Hero header extends behind the status bar for a full-bleed branded look.
// StatusBar is explicitly set to "light" so the white clock/battery icons are
// visible on the dark-blue hero background.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ADRASH_LOGO from '../../assets/Logo Adrash one.png';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';
import { DateTimePicker } from '@/features/passenger-booking/components/DateTimePicker';
import { StateView } from '@/features/passenger-booking/components/BookingUi';
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

    const fullName    = profile?.fullName ?? (user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : null);
    const initials    = getInitials(fullName);
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

            <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
                    <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.menuHeader}>
                            <View style={styles.menuAvatar}>
                                <Text style={styles.menuAvatarText}>{initials}</Text>
                            </View>
                            <View>
                                <Text style={styles.menuName}>{displayName}</Text>
                                {displayPhone ? <Text style={styles.menuPhone}>{displayPhone}</Text> : null}
                            </View>
                        </View>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setVisible(false); router.push('/(tabs)/profile'); }}>
                            <Text style={styles.menuItemIcon}>👤</Text>
                            <Text style={styles.menuItemText}>View Profile</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setVisible(false); logout(); }} disabled={isPending}>
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

// ─── City search input with live dropdown ─────────────────────────────────────

interface CityInputProps {
    label:        string;
    icon:         string;
    value:        string;
    placeholder:  string;
    allCities:    string[];
    onChangeText: (v: string) => void;
    onSelect:     (city: string) => void;
}

function CityInput({ label, icon, value, placeholder, allCities, onChangeText, onSelect }: CityInputProps) {
    const [focused, setFocused] = useState(false);

    const suggestions = useMemo(() => {
        if (!value.trim() || !focused) return [];
        const lower = value.toLowerCase();
        return allCities
            .filter((c) => c && c.toLowerCase().includes(lower) && c.toLowerCase() !== lower)
            .slice(0, 6);
    }, [allCities, value, focused]);

    const showDropdown = focused && suggestions.length > 0;

    return (
        <View>
            <View style={[styles.cityField, focused && styles.cityFieldFocused]}>
                <Text style={styles.cityFieldIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cityFieldLabel}>{label}</Text>
                    <TextInput
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setTimeout(() => setFocused(false), 150)}
                        placeholder={placeholder}
                        placeholderTextColor={Colors.text.disabled}
                        style={styles.cityFieldInput}
                        autoCorrect={false}
                        autoCapitalize="words"
                    />
                </View>
                {value.length > 0 && (
                    <Pressable
                        onPress={() => { onChangeText(''); }}
                        style={styles.clearBtn}
                        hitSlop={8}
                    >
                        <Text style={styles.clearBtnText}>✕</Text>
                    </Pressable>
                )}
            </View>

            {showDropdown && (
                <View style={styles.dropdown}>
                    {suggestions.map((city, i) => (
                        <Pressable
                            key={city}
                            style={[styles.dropdownItem, i < suggestions.length - 1 && styles.dropdownItemBorder]}
                            onPress={() => { onSelect(city); setFocused(false); }}
                        >
                            <Text style={styles.dropdownItemPin}>📍</Text>
                            <Text style={styles.dropdownItemText}>{city}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}

// ─── Home tab ─────────────────────────────────────────────────────────────────

export default function HomeTab() {
    const { t } = useTranslation();
    const {
        origin, destination, date, time, passengersCount,
        selectedRoute, recentSearches, setSearch, swap, rememberSearch, selectRoute, selectPickup,
    } = useBookingFlowStore();

    const [passengerErr, setPassengerErr] = useState<string | null>(null);
    const routesQuery = useRoutes();
    const routes = useMemo(
        () => routesQuery.data?.pages.flatMap((p) => p.items) ?? [],
        [routesQuery.data],
    );

    // All unique city names from all routes — used for autocomplete
    const allCities = useMemo(
        () => Array.from(new Set(
            routes.flatMap((r) => [r.originCity, r.destinationCity]).filter(Boolean)
        )).sort() as string[],
        [routes],
    );

    const filteredRoutes = useMemo(
        () => routeService.filter(routes, origin, destination).slice(0, 8),
        [routes, origin, destination],
    );

    const search = () => {
        try {
            rememberSearch();
            if (!selectedRoute && filteredRoutes.length > 0) {
                selectRoute(filteredRoutes[0]);
            }
        } catch {
            // guard: errors must not block navigation
        }
        router.push('/(tabs)/search/results');
    };

    const canSearch = Boolean(origin && destination && origin !== destination);

    return (
        // SafeAreaView background = brand dark blue so the status bar area is branded
        <SafeAreaView style={styles.outerContainer} edges={['top']}>
            {/* Light icons (white clock/battery) on the dark-blue hero */}
            <StatusBar style="light" />

            {/* ── Hero header ── */}
            <View style={styles.hero}>
                <View style={styles.heroRow}>
                    <Image source={ADRASH_LOGO} style={styles.logo} resizeMode="contain" />
                    <View style={styles.heroActions}>
                        <Pressable
                            style={styles.iconBtn}
                            onPress={() => router.push('/(tabs)/notifications')}
                            accessibilityLabel="Notifications"
                        >
                            <Text style={styles.iconBtnText}>🔔</Text>
                        </Pressable>
                        <AvatarMenu />
                    </View>
                </View>
                <Text style={styles.heroTitle}>{t('home.greeting')}</Text>
                <Text style={styles.heroSub}>{t('home.greeting_sub')}</Text>
            </View>

            {/* ── Scrollable light content ── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Search card ── */}
                <View style={styles.searchCard}>

                    {/* Origin */}
                    <CityInput
                        label={t('home.from')}
                        icon="🚏"
                        value={origin}
                        placeholder="e.g. Addis Ababa"
                        allCities={allCities}
                        onChangeText={(v) => { setSearch({ origin: v }); selectPickup(null); selectRoute(null); }}
                        onSelect={(city) => { setSearch({ origin: city }); selectPickup(null); selectRoute(null); }}
                    />

                    {/* Swap button */}
                    <View style={styles.swapRow}>
                        <View style={styles.swapLine} />
                        <Pressable
                            style={styles.swapBtn}
                            onPress={() => { swap(); selectPickup(null); selectRoute(null); }}
                            accessibilityLabel="Swap origin and destination"
                        >
                            <Text style={styles.swapIcon}>⇅</Text>
                        </Pressable>
                        <View style={styles.swapLine} />
                    </View>

                    {/* Destination */}
                    <CityInput
                        label={t('home.to')}
                        icon="📍"
                        value={destination}
                        placeholder="e.g. Hawassa"
                        allCities={allCities}
                        onChangeText={(v) => { setSearch({ destination: v }); selectRoute(null); }}
                        onSelect={(city) => { setSearch({ destination: city }); selectRoute(null); }}
                    />

                    {origin === destination && origin ? (
                        <Text style={styles.error}>{t('home.origin_destination_same')}</Text>
                    ) : null}

                    {/* Date + time */}
                    <DateTimePicker
                        date={date}
                        time={time}
                        onChange={(d, tm) => setSearch({ date: d, time: tm })}
                    />

                    {/* Passengers */}
                    <View>
                        <Text style={styles.counterLabel}>{t('home.passengers')}</Text>
                        <View style={styles.counterRow}>
                            <Pressable
                                style={styles.counterBtn}
                                onPress={() => {
                                    if (passengersCount <= 1) {
                                        setPassengerErr(t('home.passengers_min_error'));
                                    } else {
                                        setSearch({ passengersCount: passengersCount - 1 });
                                        setPassengerErr(null);
                                    }
                                }}
                            >
                                <Text style={styles.counterBtnText}>−</Text>
                            </Pressable>
                            <View style={styles.counterValueWrap}>
                                <Text style={styles.counterValue}>{passengersCount}</Text>
                                <Text style={styles.counterValueLabel}>
                                    {passengersCount === 1 ? 'passenger' : 'passengers'}
                                </Text>
                            </View>
                            <Pressable
                                style={styles.counterBtn}
                                onPress={() => {
                                    if (passengersCount >= 60) {
                                        setPassengerErr(t('home.passengers_max_error'));
                                    } else {
                                        setSearch({ passengersCount: passengersCount + 1 });
                                        setPassengerErr(null);
                                    }
                                }}
                            >
                                <Text style={styles.counterBtnText}>+</Text>
                            </Pressable>
                        </View>
                        {passengerErr ? <Text style={styles.passengerErr}>{passengerErr}</Text> : null}
                    </View>

                    {/* Search CTA */}
                    <Pressable
                        style={[styles.searchBtn, !canSearch && styles.disabled]}
                        disabled={!canSearch}
                        onPress={search}
                        accessibilityRole="button"
                    >
                        <Text style={styles.searchBtnText}>🔍  {t('home.search_trips')}</Text>
                    </Pressable>
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
                            style={styles.routeCard}
                            onPress={() => {
                                selectRoute(r);
                                setSearch({ origin: r.originCity, destination: r.destinationCity });
                                router.push('/(tabs)/search/results');
                            }}
                        >
                            <View style={styles.routeCardAccent} />
                            <View style={styles.routeCardBody}>
                                <View style={styles.routeCardLeft}>
                                    <Text style={styles.routeCardTitle}>
                                        {r.originCity}  →  {r.destinationCity}
                                    </Text>
                                    <Text style={styles.routeCardSub}>
                                        {r.distanceKm} km  ·  {Math.floor(r.estimatedDurationMin / 60)}h{' '}
                                        {r.estimatedDurationMin % 60 > 0 ? `${r.estimatedDurationMin % 60}m` : ''}
                                    </Text>
                                </View>
                                <Text style={styles.routeCardChev}>›</Text>
                            </View>
                        </Pressable>
                    ))
                )}

                {/* ── Recent searches — same full-width card design ── */}
                {(Array.isArray(recentSearches) ? recentSearches : []).length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>{t('home.recent_searches')}</Text>
                        {(Array.isArray(recentSearches) ? recentSearches : []).map((r, i) => (
                            <Pressable
                                key={`${r.origin}-${r.destination}-${i}`}
                                style={styles.routeCard}
                                onPress={() => {
                                    try { setSearch(r); } catch { /* guard against corrupt saved search */ }
                                    router.push('/(tabs)/search/results');
                                }}
                            >
                                <View style={[styles.routeCardAccent, { backgroundColor: Colors.text.tertiary }]} />
                                <View style={styles.routeCardBody}>
                                    <View style={styles.routeCardLeft}>
                                        <View style={styles.recentTitleRow}>
                                            <Text style={styles.recentIcon}>🕐</Text>
                                            <Text style={styles.routeCardTitle}>
                                                {r.origin}  →  {r.destination}
                                            </Text>
                                        </View>
                                        <Text style={styles.routeCardSub}>{r.date}</Text>
                                    </View>
                                    <Text style={styles.routeCardChev}>›</Text>
                                </View>
                            </Pressable>
                        ))}
                    </>
                )}

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // SafeAreaView background = brand dark so status bar area matches hero
    outerContainer: { flex: 1, backgroundColor: Colors.brand.primaryDark },
    scroll:         { flex: 1, backgroundColor: Colors.background.secondary },
    scrollContent:  { padding: Spacing.lg, gap: Spacing.md, paddingTop: Spacing.lg },

    // ── Hero ──
    hero: {
        backgroundColor: Colors.brand.primaryDark,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xl,
        gap: 6,
    },
    heroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    logo:       { width: 160, height: 56 },
    heroActions:{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    iconBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    iconBtnText: { fontSize: 16 },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.brand.secondary,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
    heroTitle:   { fontSize: 22, fontWeight: '900', color: Colors.neutral.white },
    heroSub:     { fontSize: 13, color: Colors.brand.onPrimary },

    // ── Popover ──
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'flex-end',
        paddingTop: 80,
        paddingRight: Spacing.lg,
    },
    menu: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        minWidth: 220,
        ...Shadow.lg,
        overflow: 'hidden',
    },
    menuHeader:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
    menuAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    menuAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    menuName:       { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
    menuPhone:      { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
    menuDivider:    { height: 1, backgroundColor: Colors.border.light },
    menuItem:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
    menuItemIcon:   { fontSize: 18, width: 24, textAlign: 'center' },
    menuItemText:   { fontSize: 15, color: Colors.text.primary, fontWeight: '500' },
    menuItemDanger: { color: Colors.semantic.error },

    // ── Search card ──
    searchCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        gap: Spacing.sm,
        ...Shadow.md,
    },

    // ── City input ──
    cityField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1.5,
        borderColor: Colors.border.light,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        backgroundColor: Colors.background.secondary,
    },
    cityFieldFocused: {
        borderColor: Colors.brand.primary,
        backgroundColor: Colors.brand.primaryTint,
    },
    cityFieldIcon:  { fontSize: 18, width: 22, textAlign: 'center' },
    cityFieldLabel: { fontSize: 10, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.4, marginBottom: 2 },
    cityFieldInput: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, padding: 0 },
    clearBtn:       { padding: 4 },
    clearBtnText:   { color: Colors.text.tertiary, fontWeight: '700', fontSize: 13 },

    // ── City dropdown ──
    dropdown: {
        backgroundColor: Colors.background.primary,
        borderWidth: 1.5,
        borderColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginTop: 2,
        ...Shadow.md,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 13,
    },
    dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border.light },
    dropdownItemPin:    { fontSize: 14 },
    dropdownItemText:   { fontSize: 14, fontWeight: '600', color: Colors.text.primary },

    // ── Swap ──
    swapRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: -4 },
    swapLine: { flex: 1, height: 1, backgroundColor: Colors.border.light },
    swapBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
        ...Shadow.sm,
    },
    swapIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // ── Passengers counter ──
    counterLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.4, marginBottom: 8 },
    counterRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    counterBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    counterBtnText:   { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 22 },
    counterValueWrap: { flex: 1, alignItems: 'center' },
    counterValue:     { fontSize: 22, fontWeight: '900', color: Colors.text.primary },
    counterValueLabel:{ fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
    passengerErr:     { color: Colors.semantic.error, fontSize: 11, fontWeight: '600', marginTop: 4 },
    error:            { color: Colors.semantic.error, fontWeight: '700', fontSize: 12 },

    // ── Search button ──
    searchBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: Spacing.xs,
        ...Shadow.sm,
    },
    searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
    disabled:      { opacity: 0.4 },

    // ── Section titles ──
    sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginTop: Spacing.sm },

    // ── Route / recent card (shared full-width design) ──
    routeCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        flexDirection: 'row',
        ...Shadow.sm,
    },
    routeCardAccent: { width: 4, backgroundColor: Colors.brand.primary },
    routeCardBody: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    routeCardLeft:  { flex: 1, gap: 3 },
    routeCardTitle: { fontWeight: '800', color: Colors.text.primary, fontSize: 15 },
    routeCardSub:   { color: Colors.text.tertiary, fontSize: 12, marginTop: 1 },
    routeCardChev:  { fontSize: 22, color: Colors.text.tertiary, marginLeft: Spacing.sm },

    // Recent search label row
    recentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    recentIcon:     { fontSize: 13 },
});
