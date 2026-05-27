// app/(tabs)/profile.tsx
// Real profile screen — all data comes from the API, zero mocks.
//
// APIs used:
//   GET  /api/v1/users/me                  → name, phone, language, verified
//   PATCH /api/v1/users/me                 → edit name / language
//   GET  /api/v1/rewards/balance           → points balance + ETB equivalent
//   GET  /api/v1/rewards/referral          → referral code + share link
//   GET  /api/v1/notifications/preferences → InApp / SMS toggles
//   PATCH /api/v1/notifications/preferences
//   DELETE /api/v1/users/me               → delete account

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';
import { useLogout } from '../../src/features/auth/hooks/useLogout';
import { useProfile } from '../../src/features/profile/hooks/useProfile';
import { useUpdateProfile } from '../../src/features/profile/hooks/useUpdateProfile';
import { useDeleteAccount } from '../../src/features/profile/hooks/useDeleteAccount';
import { useRewardsBalance } from '../../src/features/profile/hooks/useRewardsBalance';
import { useReferral } from '../../src/features/profile/hooks/useReferral';
import {
    useNotificationPreferences,
    useUpdateNotificationPreferences,
} from '../../src/features/profile/hooks/useNotificationPreferences';
import type { ApiLanguage, NotificationPreferenceDto } from '../../src/api/types';
import { changeLanguage } from '../../src/lib/i18n';
import { MMKVKeys } from '../../src/constants/mmkvKeys';
import { writeString } from '../../src/lib/storage';
import { useAuthStore } from '../../src/features/auth/store/authStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** "Selam Tadesse" → "ST" */
function initials(name: string | null): string {
    if (!name) return '?';
    return name
        .split(' ')
        .map((w) => w[0] ?? '')
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

/** API language codes ("En") ↔ display labels */
const LANG_OPTIONS: { code: ApiLanguage; label: string }[] = [
    { code: 'En', label: 'English' },
    { code: 'Am', label: 'አማርኛ' },
    { code: 'Om', label: 'Afaan Oromoo' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
    return <Text style={styles.sectionTitle}>{label}</Text>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const LANG_CODE_MAP: Record<ApiLanguage, 'en' | 'am' | 'om'> = {
    En: 'en', Am: 'am', Om: 'om',
};

export default function ProfileTab() {
    const { t } = useTranslation();
    // ── Auth ──────────────────────────────────────────────────────────────
    const { mutate: logout, isPending: loggingOut } = useLogout();
    const setAuthLanguage = useAuthStore((s) => s.setLanguage);
    const { mutate: deleteAccount, isPending: deleting } = useDeleteAccount();

    // ── API data ──────────────────────────────────────────────────────────
    const { data: profile, isLoading: profileLoading, error: profileError, refetch } = useProfile();
    const { data: balance, isLoading: balanceLoading } = useRewardsBalance();
    const { data: referral, isLoading: referralLoading } = useReferral();
    const { data: notifPrefs, isLoading: prefsLoading } = useNotificationPreferences();

    // ── Mutations ─────────────────────────────────────────────────────────
    const { mutate: updateProfile, isPending: saving } = useUpdateProfile();
    const { mutate: updatePrefs } = useUpdateNotificationPreferences();

    // ── Local edit state ──────────────────────────────────────────────────
    const [editing, setEditing] = useState(false);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [langPickerOpen, setLangPickerOpen] = useState(false);

    function openEdit() {
        const parts = (profile?.fullName ?? '').trim().split(/\s+/);
        setEditFirstName(parts[0] ?? '');
        setEditLastName(parts.slice(1).join(' '));
        setEditing(true);
    }

    function saveEdit() {
        const fullName = [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(' ') || null;
        updateProfile(
            { fullName },
            { onSuccess: () => setEditing(false) },
        );
    }

    function applyLanguage(lang: ApiLanguage) {
        if (lang === profile?.preferredLanguage) { setLangPickerOpen(false); return; }
        const code = LANG_CODE_MAP[lang];
        void changeLanguage(code);
        writeString(MMKVKeys.PREFERRED_LANGUAGE, code);
        setAuthLanguage(code);
        setLangPickerOpen(false);
        updateProfile({ preferredLanguage: lang });
    }

    // ── Notification toggle ───────────────────────────────────────────────
    function togglePref(pref: NotificationPreferenceDto) {
        if (!notifPrefs) return;
        const next = notifPrefs.map((p) =>
            p.channel === pref.channel && p.eventType === pref.eventType
                ? { ...p, isEnabled: !p.isEnabled }
                : p,
        );
        updatePrefs(next);
    }

    // ── Share referral ────────────────────────────────────────────────────
    async function shareReferral() {
        if (!referral?.shareLink) return;
        await Share.share({ message: `Join me on Adrash! ${referral.shareLink}` });
    }

    // ── Delete account ────────────────────────────────────────────────────
    function confirmDelete() {
        Alert.alert(
            t('profile.delete_confirm_title'),
            t('profile.delete_confirm_body'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('profile.delete'),
                    style: 'destructive',
                    onPress: () => deleteAccount(),
                },
            ],
        );
    }

    // ── Loading / error states ─────────────────────────────────────────────
    if (profileLoading) {
        return (
            <SafeAreaView style={styles.centered} edges={['top']}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
            </SafeAreaView>
        );
    }

    if (profileError || !profile) {
        return (
            <SafeAreaView style={styles.centered} edges={['top']}>
                <Text style={styles.errorText}>{t('profile.could_not_load')}</Text>
                <Pressable style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryText}>{t('common.retry')}</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    // ── Derived display values ─────────────────────────────────────────────
    const displayName = profile.fullName ?? profile.phone ?? '—';
    const avatarLetters = initials(profile.fullName);
    const currentLangLabel =
        LANG_OPTIONS.find((l) => l.code === profile.preferredLanguage)?.label ?? 'English';

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.pageTitle}>{t('profile.title')}</Text>

                {/* ── Avatar + name ── */}
                <Card style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{avatarLetters}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{displayName}</Text>
                        <Text style={styles.phone}>{profile.phone ?? '—'}</Text>
                        {profile.isVerified && (
                            <Text style={styles.verified}>{t('profile.verified')}</Text>
                        )}
                    </View>
                    <Pressable style={styles.editBtn} onPress={openEdit}>
                        <Text style={styles.editBtnText}>{t('profile.edit_btn')}</Text>
                    </Pressable>
                </Card>

                {/* ── Rewards balance ── */}
                <SectionTitle label={t('profile.rewards_section')} />
                <Card style={styles.balanceCard}>
                    {balanceLoading ? (
                        <ActivityIndicator color={Colors.neutral.white} />
                    ) : (
                        <>
                            <Text style={styles.balanceLabel}>{t('profile.balance_label')}</Text>
                            <View style={styles.balanceRow}>
                                <Text style={styles.balanceValue}>
                                    {balance?.pointsBalance.toLocaleString() ?? '0'}
                                </Text>
                                <Text style={styles.balanceUnit}> pts</Text>
                            </View>
                            <Text style={styles.balanceEquiv}>
                                ≈ ETB {balance?.etbEquivalent.toFixed(2) ?? '0.00'} in discounts
                            </Text>
                        </>
                    )}
                </Card>

                {/* ── Referral ── */}
                <Card>
                    <Text style={styles.refTitle}>🎁 {t('profile.refer')}</Text>
                    {referralLoading ? (
                        <ActivityIndicator color={Colors.brand.primary} style={{ marginTop: 8 }} />
                    ) : (
                        <>
                            <Text style={styles.refSub}>
                                Earned {referral?.totalPointsEarned ?? 0} pts from{' '}
                                {referral?.timesUsed ?? 0} referrals
                            </Text>
                            <View style={styles.refRow}>
                                <View style={styles.refCodeBox}>
                                    <Text style={styles.refCode}>
                                        {referral?.code ?? '—'}
                                    </Text>
                                </View>
                                <Pressable
                                    style={styles.refShareBtn}
                                    onPress={shareReferral}
                                    disabled={!referral?.shareLink}
                                >
                                    <Text style={styles.refShareText}>{t('profile.share')}</Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </Card>

                {/* ── Notification preferences ── */}
                <SectionTitle label={t('profile.notifications_section')} />
                <Card>
                    {prefsLoading ? (
                        <ActivityIndicator color={Colors.brand.primary} />
                    ) : !notifPrefs || notifPrefs.length === 0 ? (
                        <Text style={styles.emptyPrefs}>No preferences found.</Text>
                    ) : (
                        notifPrefs.map((pref, i) => (
                            <View
                                key={`${pref.channel}-${pref.eventType ?? 'all'}`}
                                style={[styles.prefRow, i > 0 && styles.prefDivider]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.prefLabel}>
                                        {pref.channel === 'InApp' ? '📱' : '💬'}{' '}
                                        {pref.eventType ?? t('profile.all_notifications')}{' '}
                                        <Text style={styles.prefChannel}>({pref.channel})</Text>
                                    </Text>
                                </View>
                                <Switch
                                    value={pref.isEnabled}
                                    onValueChange={() => togglePref(pref)}
                                    trackColor={{
                                        true: Colors.brand.primary,
                                        false: Colors.neutral.gray300,
                                    }}
                                />
                            </View>
                        ))
                    )}
                </Card>

                {/* ── Account (language inline picker + status + role) ── */}
                <SectionTitle label={t('profile.account_section')} />
                <Card>
                    <Pressable style={styles.rowItem} onPress={() => setLangPickerOpen((v) => !v)}>
                        <Text style={styles.rowIcon}>🌐</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>{t('profile.language')}</Text>
                            <Text style={styles.rowSub}>{currentLangLabel}</Text>
                        </View>
                        <Text style={styles.rowChev}>{langPickerOpen ? '∨' : '›'}</Text>
                    </Pressable>
                    {langPickerOpen && (
                        <View style={styles.inlineLangPicker}>
                            {LANG_OPTIONS.map((l) => (
                                <Pressable
                                    key={l.code}
                                    style={[styles.inlineLangOpt, profile?.preferredLanguage === l.code && styles.inlineLangOptActive]}
                                    onPress={() => applyLanguage(l.code)}
                                >
                                    <Text style={[styles.inlineLangOptText, profile?.preferredLanguage === l.code && styles.inlineLangOptTextActive]}>
                                        {l.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    <View style={[styles.rowItem, styles.rowDivider]}>
                        <Text style={styles.rowIcon}>🔒</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>{t('profile.account_status')}</Text>
                            <Text style={styles.rowSub}>
                                {profile.isVerified ? t('profile.verified') : t('profile.unverified')}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.rowItem, styles.rowDivider]}>
                        <Text style={styles.rowIcon}>👤</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>{t('profile.role')}</Text>
                            <Text style={styles.rowSub}>{profile.role}</Text>
                        </View>
                    </View>
                </Card>

                {/* ── Danger zone ── */}
                <SectionTitle label={t('profile.danger_zone')} />
                <Card>
                    <Pressable style={styles.deleteRow} onPress={confirmDelete} disabled={deleting}>
                        <Text style={styles.deleteText}>
                            {deleting ? t('profile.deleting') : `🗑  ${t('profile.delete_account')}`}
                        </Text>
                    </Pressable>
                </Card>

                {/* ── Logout ── */}
                <Pressable
                    style={styles.logoutBtn}
                    onPress={() => logout()}
                    disabled={loggingOut}
                >
                    <Text style={styles.logoutText}>
                        {loggingOut ? t('profile.logging_out') : t('profile.logout')}
                    </Text>
                </Pressable>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>

            {/* ── Edit modal overlay ── */}
            {editing && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('profile.edit_title')}</Text>
                            <Pressable
                                onPress={() => setEditing(false)}
                                style={styles.modalClose}
                                disabled={saving}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                        </View>

                        {/* Avatar preview */}
                        <View style={styles.modalAvatarRow}>
                            <View style={styles.modalAvatar}>
                                <Text style={styles.modalAvatarText}>
                                    {[editFirstName[0], editLastName[0]]
                                        .filter(Boolean).join('').toUpperCase() || avatarLetters}
                                </Text>
                            </View>
                        </View>

                        {/* First name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('profile.first_name')}</Text>
                            <TextInput
                                style={styles.input}
                                value={editFirstName}
                                onChangeText={setEditFirstName}
                                placeholder={t('profile.first_name')}
                                placeholderTextColor={Colors.text.disabled}
                                autoCorrect={false}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Last name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('profile.last_name')}</Text>
                            <TextInput
                                style={styles.input}
                                value={editLastName}
                                onChangeText={setEditLastName}
                                placeholder={t('profile.last_name')}
                                placeholderTextColor={Colors.text.disabled}
                                autoCorrect={false}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Buttons */}
                        <View style={styles.modalBtns}>
                            <Pressable
                                style={styles.modalCancel}
                                onPress={() => setEditing(false)}
                                disabled={saving}
                            >
                                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalSave, saving && styles.modalSaveDisabled]}
                                onPress={saveEdit}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color={Colors.neutral.white} />
                                ) : (
                                    <Text style={styles.modalSaveText}>{t('common.save')}</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },
    scroll: { padding: Spacing.lg, gap: Spacing.md },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },

    pageTitle: { fontSize: 26, fontWeight: '800', color: Colors.text.primary },

    // Section title
    sectionTitle: {
        fontSize: 13, fontWeight: '700', color: Colors.text.tertiary,
        letterSpacing: 0.5, marginTop: Spacing.sm,
    },

    // Generic card
    card: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        ...Shadow.sm,
    },

    // Profile header card
    profileCard: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    },
    avatar: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: Colors.neutral.white, fontSize: 24, fontWeight: '800' },
    name: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
    phone: { color: Colors.text.secondary, fontSize: 13, marginTop: 2 },
    verified: { color: Colors.semantic.success, fontSize: 12, fontWeight: '700', marginTop: 2 },
    editBtn: {
        borderWidth: 1, borderColor: Colors.brand.primary,
        paddingHorizontal: Spacing.md, paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    editBtnText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 12 },

    // Balance card
    balanceCard: { backgroundColor: Colors.brand.primary, gap: 4 },
    balanceLabel: { color: Colors.brand.onPrimary, fontSize: 13, fontWeight: '600' },
    balanceRow: { flexDirection: 'row', alignItems: 'baseline' },
    balanceValue: { color: Colors.neutral.white, fontSize: 40, fontWeight: '800' },
    balanceUnit: { color: Colors.brand.onPrimary, fontSize: 16 },
    balanceEquiv: { color: Colors.brand.onPrimary, fontSize: 12 },

    // Referral
    refTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
    refSub: { color: Colors.text.tertiary, fontSize: 13, marginTop: 4 },
    refRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
    refCodeBox: {
        flex: 1, backgroundColor: Colors.background.secondary,
        borderRadius: BorderRadius.md, padding: Spacing.md,
    },
    refCode: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: Colors.text.primary },
    refShareBtn: {
        backgroundColor: Colors.brand.primary,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    refShareText: { color: Colors.neutral.white, fontWeight: '700' },

    // Notification prefs
    prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
    prefDivider: { borderTopWidth: 1, borderTopColor: Colors.border.light },
    prefLabel: { color: Colors.text.primary, fontWeight: '600', fontSize: 14 },
    prefChannel: { color: Colors.text.tertiary, fontWeight: '400', fontSize: 12 },
    emptyPrefs: { color: Colors.text.tertiary, fontSize: 13 },

    // Account rows
    rowItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
    rowDivider: { borderTopWidth: 1, borderTopColor: Colors.border.light },
    rowIcon: { fontSize: 22 },
    rowLabel: { color: Colors.text.primary, fontWeight: '600' },
    rowSub: { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
    rowChev: { fontSize: 22, color: Colors.text.tertiary },

    // Danger / logout
    deleteRow: { paddingVertical: Spacing.sm },
    deleteText: { color: Colors.semantic.error, fontWeight: '700', fontSize: 14 },
    logoutBtn: {
        borderWidth: 1, borderColor: Colors.semantic.error,
        borderRadius: BorderRadius.lg, paddingVertical: 14,
        alignItems: 'center', marginTop: Spacing.sm,
    },
    logoutText: { color: Colors.semantic.error, fontWeight: '700' },

    // Error state
    errorText: { color: Colors.text.secondary, fontSize: 15 },
    retryBtn: {
        backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.xl,
        paddingVertical: 12, borderRadius: BorderRadius.lg,
    },
    retryText: { color: Colors.neutral.white, fontWeight: '700' },

    // Inline language picker
    inlineLangPicker: {
        flexDirection: 'row', gap: Spacing.sm,
        paddingTop: Spacing.sm, paddingBottom: Spacing.xs,
    },
    inlineLangOpt: {
        flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md,
        borderWidth: 1.5, borderColor: Colors.border.light,
        alignItems: 'center',
    },
    inlineLangOptActive: { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primaryTint },
    inlineLangOptText: { color: Colors.text.secondary, fontWeight: '600', fontSize: 12 },
    inlineLangOptTextActive: { color: Colors.brand.primary, fontWeight: '700' },

    // Edit modal
    modalOverlay: {
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', padding: Spacing.lg,
    },
    modal: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl, gap: Spacing.lg,
        ...Shadow.lg,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    modalTitle: { fontSize: 20, fontWeight: '900', color: Colors.text.primary },
    modalClose: { padding: 6 },
    modalCloseText: { fontSize: 18, color: Colors.text.tertiary, fontWeight: '700' },
    modalAvatarRow: { alignItems: 'center', paddingVertical: Spacing.xs },
    modalAvatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
        ...Shadow.sm,
    },
    modalAvatarText: { color: Colors.neutral.white, fontSize: 26, fontWeight: '900' },
    inputGroup: { gap: 6 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
    input: {
        borderWidth: 1.5, borderColor: Colors.border.medium,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md, paddingVertical: 13,
        fontSize: 16, color: Colors.text.primary,
        backgroundColor: Colors.background.secondary,
    },
    modalBtns: { flexDirection: 'row', gap: Spacing.md },
    modalCancel: {
        flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg,
        borderWidth: 1.5, borderColor: Colors.border.medium, alignItems: 'center',
    },
    modalCancelText: { color: Colors.text.primary, fontWeight: '700' },
    modalSave: {
        flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg,
        backgroundColor: Colors.brand.primary, alignItems: 'center',
    },
    modalSaveDisabled: { opacity: 0.5 },
    modalSaveText: { color: Colors.neutral.white, fontWeight: '700' },
});