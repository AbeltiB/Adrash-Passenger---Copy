// app/(tabs)/profile.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Modal,
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
import { usePinSetup } from '../../src/features/auth/hooks/usePinSetup';
import { useProfile } from '../../src/features/profile/hooks/useProfile';
import { useUpdateProfile } from '../../src/features/profile/hooks/useUpdateProfile';
import { useDeleteAccount } from '../../src/features/profile/hooks/useDeleteAccount';
import { useRewardsBalance } from '../../src/features/profile/hooks/useRewardsBalance';
import { useReferral } from '../../src/features/profile/hooks/useReferral';
import {
    useNotificationPreferences,
    useUpdateNotificationPreferences,
} from '../../src/features/profile/hooks/useNotificationPreferences';
import { useCurrentAgreement } from '../../src/features/agreements/hooks/useAgreements';
import type { ApiLanguage, NotificationPreferenceDto } from '../../src/api/types';
import { changeLanguage } from '../../src/lib/i18n';
import { MMKVKeys } from '../../src/constants/mmkvKeys';
import { writeString } from '../../src/lib/storage';
import { useAuthStore } from '../../src/features/auth/store/authStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

const LANG_OPTIONS: { code: ApiLanguage; label: string }[] = [
    { code: 'En', label: 'English' },
    { code: 'Am', label: 'አማርኛ' },
    { code: 'Om', label: 'Afaan Oromoo' },
];

const LANG_CODE_MAP: Record<ApiLanguage, 'en' | 'am' | 'om'> = {
    En: 'en', Am: 'am', Om: 'om',
};

function SectionTitle({ label }: { label: string }) {
    return <Text style={styles.sectionTitle}>{label}</Text>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileTab() {
    const { t } = useTranslation();

    const { mutate: logout,        isPending: loggingOut  } = useLogout();
    const { mutate: changePin,     isPending: savingPin   } = usePinSetup();
    const setAuthLanguage = useAuthStore((s) => s.setLanguage);
    const { mutate: deleteAccount, isPending: deleting    } = useDeleteAccount();

    const { data: profile, isLoading: profileLoading, error: profileError, refetch } = useProfile();
    const { data: balance,    isLoading: balanceLoading  } = useRewardsBalance();
    const { data: referral,   isLoading: referralLoading } = useReferral();
    const { data: notifPrefs, isLoading: prefsLoading    } = useNotificationPreferences();
    const { data: agreement,  isLoading: agreementLoading } = useCurrentAgreement();

    const { mutate: updateProfile, isPending: saving     } = useUpdateProfile();
    const { mutate: updatePrefs                          } = useUpdateNotificationPreferences();

    // ── Edit name modal ───────────────────────────────────────────────────────
    const [editing,       setEditing]       = useState(false);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName,  setEditLastName]  = useState('');

    // ── PIN change modal ──────────────────────────────────────────────────────
    const [pinOpen,    setPinOpen]    = useState(false);
    const [pinPhase,   setPinPhase]   = useState<'current' | 'new' | 'confirm'>('current');
    const [pinCurrent, setPinCurrent] = useState('');
    const [pinNew,     setPinNew]     = useState('');
    const [pinConfirm, setPinConfirm] = useState('');
    const [pinError,   setPinError]   = useState<string | null>(null);

    // ── Other UI ──────────────────────────────────────────────────────────────
    const [langPickerOpen, setLangPickerOpen] = useState(false);
    const [termsOpen,      setTermsOpen]      = useState(false);

    // ── Handlers ─────────────────────────────────────────────────────────────

    function openEdit() {
        const parts = (profile?.fullName ?? '').trim().split(/\s+/);
        setEditFirstName(parts[0] ?? '');
        setEditLastName(parts.slice(1).join(' '));
        setEditing(true);
    }

    function saveEdit() {
        const fullName = [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(' ') || null;
        updateProfile({ fullName }, { onSuccess: () => setEditing(false) });
    }

    function openPinChange() {
        setPinCurrent(''); setPinNew(''); setPinConfirm('');
        setPinError(null); setPinPhase('current');
        setPinOpen(true);
    }

    function handlePinNext() {
        setPinError(null);
        if (pinPhase === 'current') {
            if (pinCurrent.length < 4) { setPinError('Enter your current PIN.'); return; }
            setPinPhase('new');
        } else if (pinPhase === 'new') {
            if (pinNew.length < 4) { setPinError('PIN must be at least 4 digits.'); return; }
            setPinPhase('confirm');
        } else {
            if (pinConfirm !== pinNew) { setPinError(t('auth.pin_setup.mismatch')); return; }
            changePin(
                { newPin: pinNew, currentPin: pinCurrent },
                {
                    onSuccess: () => { setPinOpen(false); Alert.alert(t('profile.pin_changed')); },
                    onError:   () => { setPinError(t('profile.pin_wrong')); setPinPhase('current'); },
                },
            );
        }
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

    function togglePref(pref: NotificationPreferenceDto) {
        if (!notifPrefs) return;
        const next = notifPrefs.map((p) =>
            p.channel === pref.channel && p.eventType === pref.eventType
                ? { ...p, isEnabled: !p.isEnabled }
                : p,
        );
        updatePrefs(next);
    }

    async function shareReferral() {
        if (!referral?.shareLink) return;
        await Share.share({ message: `Join me on Adrash! ${referral.shareLink}` });
    }

    function confirmDelete() {
        Alert.alert(
            t('profile.delete_confirm_title'),
            t('profile.delete_confirm_body'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('profile.delete'), style: 'destructive', onPress: () => deleteAccount() },
            ],
        );
    }

    // ── Loading / error ───────────────────────────────────────────────────────
    if (profileLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.primary} />
              </View>
            </SafeAreaView>
        );
    }

    if (profileError || !profile) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
              <View style={styles.centered}>
                <Text style={styles.errorText}>{t('profile.could_not_load')}</Text>
                <Pressable style={styles.retryBtn} onPress={() => refetch()}>
                    <Text style={styles.retryText}>{t('common.retry')}</Text>
                </Pressable>
              </View>
            </SafeAreaView>
        );
    }

    const displayName       = profile.fullName ?? profile.phone ?? '—';
    const avatarLetters     = initials(profile.fullName);
    const currentLangLabel  = LANG_OPTIONS.find((l) => l.code === profile.preferredLanguage)?.label ?? 'English';

    // ── PIN phase label ───────────────────────────────────────────────────────
    const pinPhaseLabel = pinPhase === 'current'
        ? t('profile.current_pin')
        : pinPhase === 'new'
            ? t('profile.new_pin')
            : t('profile.confirm_pin');
    const pinPhaseValue = pinPhase === 'current' ? pinCurrent
        : pinPhase === 'new' ? pinNew : pinConfirm;
    const pinPhaseSet   = pinPhase === 'current' ? setPinCurrent
        : pinPhase === 'new' ? setPinNew : setPinConfirm;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.inner}>
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
                                    <Text style={styles.refCode}>{referral?.code ?? '—'}</Text>
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
                                    trackColor={{ true: Colors.brand.primary, false: Colors.neutral.gray300 }}
                                />
                            </View>
                        ))
                    )}
                </Card>

                {/* ── Account ── */}
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
                                    style={[
                                        styles.inlineLangOpt,
                                        profile.preferredLanguage === l.code && styles.inlineLangOptActive,
                                    ]}
                                    onPress={() => applyLanguage(l.code)}
                                >
                                    <Text style={[
                                        styles.inlineLangOptText,
                                        profile.preferredLanguage === l.code && styles.inlineLangOptTextActive,
                                    ]}>
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
                    <Pressable
                        style={[styles.rowItem, styles.rowDivider]}
                        onPress={() => setTermsOpen(true)}
                    >
                        <Text style={styles.rowIcon}>📋</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>{t('profile.terms_conditions')}</Text>
                            <Text style={styles.rowSub}>{t('profile.terms_conditions_sub')}</Text>
                        </View>
                        <Text style={styles.rowChev}>›</Text>
                    </Pressable>
                </Card>

                {/* ── Security ── */}
                <SectionTitle label={t('profile.security')} />
                <Card>
                    <Pressable style={styles.rowItem} onPress={openPinChange}>
                        <Text style={styles.rowIcon}>🔑</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>{t('profile.change_pin')}</Text>
                            <Text style={styles.rowSub}>{t('profile.change_pin_sub')}</Text>
                        </View>
                        <Text style={styles.rowChev}>›</Text>
                    </Pressable>
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

                <Pressable style={styles.logoutBtn} onPress={() => logout()} disabled={loggingOut}>
                    <Text style={styles.logoutText}>
                        {loggingOut ? t('profile.logging_out') : t('profile.logout')}
                    </Text>
                </Pressable>

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
          </View>

            {/* ── Edit name bottom sheet ── */}
            <Modal
                visible={editing}
                transparent
                animationType="slide"
                onRequestClose={() => { if (!saving) setEditing(false); }}
            >
                <Pressable style={styles.editBackdrop} onPress={() => { if (!saving) setEditing(false); }}>
                    <Pressable style={styles.editSheet} onPress={(e) => e.stopPropagation()}>
                        {/* Drag handle */}
                        <View style={styles.editHandle} />

                        {/* Live avatar preview */}
                        <View style={styles.editAvatarWrap}>
                            <View style={styles.modalAvatar}>
                                <Text style={styles.modalAvatarText}>
                                    {[editFirstName[0], editLastName[0]].filter(Boolean).join('').toUpperCase() || avatarLetters}
                                </Text>
                            </View>
                            <Text style={styles.editPreviewName} numberOfLines={1}>
                                {[editFirstName, editLastName].filter(Boolean).join(' ') || '—'}
                            </Text>
                        </View>

                        <Text style={styles.editSheetTitle}>{t('profile.edit_title')}</Text>

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
                                returnKeyType="next"
                                editable={!saving}
                            />
                        </View>

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
                                returnKeyType="done"
                                onSubmitEditing={saveEdit}
                                editable={!saving}
                            />
                        </View>

                        <Pressable
                            style={[styles.editSaveBtn, saving && styles.modalSaveDisabled]}
                            onPress={saveEdit}
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator color={Colors.neutral.white} />
                                : <Text style={styles.editSaveBtnText}>{t('common.save')}</Text>}
                        </Pressable>

                        <Pressable style={styles.editCancelBtn} onPress={() => setEditing(false)} disabled={saving}>
                            <Text style={styles.editCancelBtnText}>{t('common.cancel')}</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── PIN change overlay ── */}
            {pinOpen && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('profile.change_pin')}</Text>
                            <Pressable onPress={() => setPinOpen(false)} style={styles.modalClose} disabled={savingPin}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                        </View>

                        {/* Step indicator */}
                        <View style={styles.pinSteps}>
                            {(['current', 'new', 'confirm'] as const).map((phase, i) => (
                                <View key={phase} style={[styles.pinStep, pinPhase === phase && styles.pinStepActive]} />
                            ))}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{pinPhaseLabel}</Text>
                            <TextInput
                                style={[styles.input, styles.pinInput]}
                                value={pinPhaseValue}
                                onChangeText={(v) => { pinPhaseSet(v.replace(/\D/g, '').slice(0, 6)); setPinError(null); }}
                                placeholder="• • • • • •"
                                placeholderTextColor={Colors.text.disabled}
                                keyboardType="number-pad"
                                maxLength={6}
                                secureTextEntry
                                textAlign="center"
                            />
                            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
                        </View>

                        <View style={styles.modalBtns}>
                            <Pressable
                                style={styles.modalCancel}
                                onPress={() => {
                                    if (pinPhase === 'current') { setPinOpen(false); }
                                    else setPinPhase(pinPhase === 'confirm' ? 'new' : 'current');
                                }}
                                disabled={savingPin}
                            >
                                <Text style={styles.modalCancelText}>{t('common.back')}</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalSave, savingPin && styles.modalSaveDisabled]}
                                onPress={handlePinNext}
                                disabled={savingPin || pinPhaseValue.length < 4}
                            >
                                {savingPin
                                    ? <ActivityIndicator color={Colors.neutral.white} />
                                    : <Text style={styles.modalSaveText}>
                                        {pinPhase === 'confirm' ? t('common.save') : t('common.next')}
                                    </Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}

            {/* ── Terms & Conditions modal ── */}
            <Modal
                visible={termsOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setTermsOpen(false)}
            >
                <View style={styles.termsBackdrop}>
                    <View style={styles.termsSheet}>
                        <View style={styles.termsHeader}>
                            <Text style={styles.termsTitle} numberOfLines={2}>
                                {agreement?.title ?? t('profile.terms_conditions')}
                            </Text>
                            <Pressable onPress={() => setTermsOpen(false)} style={styles.modalClose}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                        </View>
                        {agreement?.version ? (
                            <Text style={styles.termsVersion}>v{agreement.version}</Text>
                        ) : null}
                        {agreementLoading ? (
                            <ActivityIndicator color={Colors.brand.primary} style={{ marginTop: Spacing.xl }} />
                        ) : (
                            <ScrollView
                                style={styles.termsScroll}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: Spacing.xl }}
                            >
                                <Text style={styles.termsContent}>{agreement?.content ?? ''}</Text>
                            </ScrollView>
                        )}
                        <Pressable style={styles.termsCloseBtn} onPress={() => setTermsOpen(false)}>
                            <Text style={styles.termsCloseBtnText}>{t('common.close')}</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.brand.primaryDark },
    inner:     { flex: 1, backgroundColor: Colors.background.secondary },
    scroll:    { padding: Spacing.lg, gap: Spacing.md },
    centered:  { flex: 1, backgroundColor: Colors.background.secondary, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },

    pageTitle: { fontSize: 26, fontWeight: '800', color: Colors.text.primary },
    sectionTitle: {
        fontSize: 13, fontWeight: '700', color: Colors.text.tertiary,
        letterSpacing: 0.5, marginTop: Spacing.sm,
    },
    card: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm,
    },

    profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    avatar: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: Colors.neutral.white, fontSize: 24, fontWeight: '800' },
    name:     { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
    phone:    { color: Colors.text.secondary, fontSize: 13, marginTop: 2 },
    verified: { color: Colors.semantic.success, fontSize: 12, fontWeight: '700', marginTop: 2 },
    editBtn: {
        borderWidth: 1, borderColor: Colors.brand.primary,
        paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full,
    },
    editBtnText: { color: Colors.brand.primary, fontWeight: '700', fontSize: 12 },

    balanceCard:  { backgroundColor: Colors.brand.primary, gap: 4 },
    balanceLabel: { color: Colors.brand.onPrimary, fontSize: 13, fontWeight: '600' },
    balanceRow:   { flexDirection: 'row', alignItems: 'baseline' },
    balanceValue: { color: Colors.neutral.white, fontSize: 40, fontWeight: '800' },
    balanceUnit:  { color: Colors.brand.onPrimary, fontSize: 16 },
    balanceEquiv: { color: Colors.brand.onPrimary, fontSize: 12 },

    refTitle:   { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
    refSub:     { color: Colors.text.tertiary, fontSize: 13, marginTop: 4 },
    refRow:     { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
    refCodeBox: {
        flex: 1, backgroundColor: Colors.background.secondary,
        borderRadius: BorderRadius.md, padding: Spacing.md,
    },
    refCode:     { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: Colors.text.primary },
    refShareBtn: {
        backgroundColor: Colors.brand.primary,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    },
    refShareText: { color: Colors.neutral.white, fontWeight: '700' },

    prefRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
    prefDivider: { borderTopWidth: 1, borderTopColor: Colors.border.light },
    prefLabel:   { color: Colors.text.primary, fontWeight: '600', fontSize: 14 },
    prefChannel: { color: Colors.text.tertiary, fontWeight: '400', fontSize: 12 },
    emptyPrefs:  { color: Colors.text.tertiary, fontSize: 13 },

    rowItem:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
    rowDivider: { borderTopWidth: 1, borderTopColor: Colors.border.light },
    rowIcon:    { fontSize: 22 },
    rowLabel:   { color: Colors.text.primary, fontWeight: '600' },
    rowSub:     { color: Colors.text.tertiary, fontSize: 12, marginTop: 2 },
    rowChev:    { fontSize: 22, color: Colors.text.tertiary },

    deleteRow:  { paddingVertical: Spacing.sm },
    deleteText: { color: Colors.semantic.error, fontWeight: '700', fontSize: 14 },
    logoutBtn: {
        borderWidth: 1, borderColor: Colors.semantic.error,
        borderRadius: BorderRadius.lg, paddingVertical: 14,
        alignItems: 'center', marginTop: Spacing.sm,
    },
    logoutText: { color: Colors.semantic.error, fontWeight: '700' },

    errorText: { color: Colors.text.secondary, fontSize: 15 },
    retryBtn: {
        backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.xl,
        paddingVertical: 12, borderRadius: BorderRadius.lg,
    },
    retryText: { color: Colors.neutral.white, fontWeight: '700' },

    inlineLangPicker: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
    inlineLangOpt: {
        flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md,
        borderWidth: 1.5, borderColor: Colors.border.light, alignItems: 'center',
    },
    inlineLangOptActive:     { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primaryTint },
    inlineLangOptText:       { color: Colors.text.secondary, fontWeight: '600', fontSize: 12 },
    inlineLangOptTextActive: { color: Colors.brand.primary, fontWeight: '700' },

    // ── Edit name bottom sheet ─────────────────────────────────────────────────
    editBackdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
    },
    editSheet: {
        backgroundColor: Colors.background.primary,
        borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'],
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing['3xl'],
        gap: Spacing.md, ...Shadow.lg,
    },
    editHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: Colors.border.medium,
        alignSelf: 'center', marginBottom: Spacing.sm,
    },
    editAvatarWrap: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
    editPreviewName: {
        fontSize: 18, fontWeight: '800', color: Colors.text.primary, textAlign: 'center',
    },
    editSheetTitle: {
        fontSize: 13, fontWeight: '700', color: Colors.text.tertiary,
        letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    editSaveBtn: {
        backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 16, alignItems: 'center', marginTop: Spacing.xs,
    },
    editSaveBtnText: { color: Colors.neutral.white, fontWeight: '800', fontSize: 16 },
    editCancelBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
    editCancelBtnText: { color: Colors.text.tertiary, fontWeight: '600', fontSize: 15 },

    // ── Modals (shared) ────────────────────────────────────────────────────────
    modal: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl, padding: Spacing.xl, gap: Spacing.lg, ...Shadow.lg,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle:     { fontSize: 20, fontWeight: '900', color: Colors.text.primary },
    modalClose:     { padding: 6 },
    modalCloseText: { fontSize: 18, color: Colors.text.tertiary, fontWeight: '700' },
    modalAvatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.brand.primary,
        alignItems: 'center', justifyContent: 'center', ...Shadow.sm,
    },
    modalAvatarText: { color: Colors.neutral.white, fontSize: 28, fontWeight: '900' },
    inputGroup: { gap: 6 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
    input: {
        borderWidth: 1.5, borderColor: Colors.border.medium, borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md, paddingVertical: 13,
        fontSize: 16, color: Colors.text.primary, backgroundColor: Colors.background.secondary,
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

    // ── PIN ────────────────────────────────────────────────────────────────────
    pinSteps: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
    pinStep: {
        flex: 1, height: 4, borderRadius: 2,
        backgroundColor: Colors.border.light, maxWidth: 60,
    },
    pinStepActive: { backgroundColor: Colors.brand.primary },
    pinInput: { fontSize: 22, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },
    pinError: { color: Colors.semantic.error, fontSize: 12, fontWeight: '600', marginTop: 4 },

    // ── Terms ──────────────────────────────────────────────────────────────────
    termsBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    termsSheet: {
        backgroundColor: Colors.background.primary,
        borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'],
        padding: Spacing.xl, paddingBottom: Spacing['2xl'], maxHeight: '90%',
        gap: Spacing.md, ...Shadow.lg,
    },
    termsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
    termsTitle:   { flex: 1, fontSize: 20, fontWeight: '900', color: Colors.text.primary },
    termsVersion: { fontSize: 12, color: Colors.text.tertiary, marginTop: -Spacing.xs },
    termsScroll:  { flex: 1, maxHeight: 420 },
    termsContent: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22 },
    termsCloseBtn: {
        backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.lg,
        paddingVertical: 14, alignItems: 'center',
    },
    termsCloseBtnText: { color: Colors.neutral.white, fontWeight: '700', fontSize: 16 },
});
