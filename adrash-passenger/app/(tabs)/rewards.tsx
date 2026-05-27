// app/(tabs)/rewards.tsx
// Rewards screen — real API data throughout.
// APIs: GET /rewards/balance, GET /rewards/history (paginated), GET /rewards/referral

import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../src/constants';
import { useRewardsBalance } from '../../src/features/profile/hooks/useRewardsBalance';
import { useReferral } from '../../src/features/profile/hooks/useReferral';
import { useRewardsHistory } from '../../src/features/profile/hooks/useRewardsHistory';
import type { RewardsTransactionType } from '../../src/api/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txIcon(type: RewardsTransactionType): string {
    switch (type) {
        case 'Earn':          return '⭐';
        case 'Redeem':        return '🛒';
        case 'Referral':      return '👥';
        case 'RedeemReversal': return '↩️';
        default:              return '💡';
    }
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RewardsTab() {
    const { t } = useTranslation();
    const balance  = useRewardsBalance();
    const referral = useReferral();
    const history  = useRewardsHistory();

    const transactions = history.data?.pages.flatMap((p) => p.items) ?? [];
    const isRefreshing = balance.isFetching || referral.isFetching || history.isFetching;

    async function shareReferral() {
        if (!referral.data?.shareLink) return;
        await Share.share({
            message: `Join me on Adrash — Ethiopia's intercity bus booking app! Use my referral code ${referral.data.code ?? ''} and earn bonus points. ${referral.data.shareLink}`,
        });
    }

    function onRefresh() {
        void balance.refetch();
        void referral.refetch();
        void history.refetch();
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
                }
            >
                <Text style={styles.title}>{t('rewards.title')}</Text>

                {/* ── Points balance card ── */}
                <View style={styles.balanceCard}>
                    {balance.isLoading ? (
                        <ActivityIndicator color={Colors.neutral.white} size="large" />
                    ) : balance.isError ? (
                        <Text style={styles.balanceError}>{t('rewards.balance_error')}</Text>
                    ) : (
                        <>
                            <Text style={styles.balanceLabel}>{t('rewards.balance')}</Text>
                            <View style={styles.balanceRow}>
                                <Text style={styles.balanceValue}>
                                    {(balance.data?.pointsBalance ?? 0).toLocaleString()}
                                </Text>
                                <Text style={styles.balanceUnit}> pts</Text>
                            </View>
                            <Text style={styles.balanceEquiv}>
                                ≈ ETB {(balance.data?.etbEquivalent ?? 0).toFixed(2)}
                            </Text>
                            <View style={styles.balanceStats}>
                                <View style={styles.balanceStat}>
                                    <Text style={styles.balanceStatValue}>
                                        {(balance.data?.lifetimeEarned ?? 0).toLocaleString()}
                                    </Text>
                                    <Text style={styles.balanceStatLabel}>{t('rewards.lifetime_earned')}</Text>
                                </View>
                                <View style={styles.balanceStatDivider} />
                                <View style={styles.balanceStat}>
                                    <Text style={styles.balanceStatValue}>
                                        {(balance.data?.lifetimeRedeemed ?? 0).toLocaleString()}
                                    </Text>
                                    <Text style={styles.balanceStatLabel}>{t('rewards.total_redeemed')}</Text>
                                </View>
                                <View style={styles.balanceStatDivider} />
                                <View style={styles.balanceStat}>
                                    <Text style={styles.balanceStatValue}>
                                        {balance.data?.minRedemptionPoints ?? 100}
                                    </Text>
                                    <Text style={styles.balanceStatLabel}>{t('rewards.min_to_redeem')}</Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* ── How it works (collapsed info) ── */}
                <View style={styles.howCard}>
                    <Text style={styles.howTitle}>{t('rewards.how_title')}</Text>
                    <View style={styles.howRow}>
                        <Text style={styles.howIcon}>⭐</Text>
                        <Text style={styles.howText}>{t('rewards.how_earn')}</Text>
                    </View>
                    <View style={styles.howRow}>
                        <Text style={styles.howIcon}>🛒</Text>
                        <Text style={styles.howText}>{t('rewards.how_redeem')}</Text>
                    </View>
                    <View style={styles.howRow}>
                        <Text style={styles.howIcon}>👥</Text>
                        <Text style={styles.howText}>{t('rewards.how_referral')}</Text>
                    </View>
                </View>

                {/* ── Referral card ── */}
                <View style={styles.referralCard}>
                    <Text style={styles.refTitle}>🎁 {t('rewards.refer_title')}</Text>
                    {referral.isLoading ? (
                        <ActivityIndicator color={Colors.brand.primary} style={{ marginTop: Spacing.sm }} />
                    ) : (
                        <>
                            <Text style={styles.refSub}>
                                {referral.data?.timesUsed ?? 0} friends referred ·{' '}
                                {referral.data?.totalPointsEarned ?? 0} pts earned from referrals
                            </Text>
                            <View style={styles.refRow}>
                                <View style={styles.refCodeBox}>
                                    <Text style={styles.refCode}>
                                        {referral.data?.code ?? '—'}
                                    </Text>
                                </View>
                                <Pressable
                                    style={styles.refShare}
                                    onPress={() => void shareReferral()}
                                    disabled={!referral.data?.shareLink}
                                >
                                    <Text style={styles.refShareText}>{t('common.share')}</Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>

                {/* ── Points history ── */}
                <Text style={styles.sectionTitle}>{t('rewards.history_title')}</Text>

                {history.isLoading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={Colors.brand.primary} />
                    </View>
                ) : history.isError ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{t('rewards.history_error')}</Text>
                        <Pressable onPress={() => void history.refetch()}>
                            <Text style={styles.retryText}>{t('common.retry')}</Text>
                        </Pressable>
                    </View>
                ) : transactions.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>⭐</Text>
                        <Text style={styles.emptyText}>{t('rewards.start_earning')}</Text>
                    </View>
                ) : (
                    <>
                        {transactions.map((tx) => {
                            const positive = tx.points > 0;
                            return (
                                <View key={tx.id} style={styles.txItem}>
                                    <View style={styles.txIconBox}>
                                        <Text style={styles.txIcon}>{txIcon(tx.type)}</Text>
                                    </View>
                                    <View style={styles.txBody}>
                                        <Text style={styles.txLabel}>
                                            {tx.description ?? tx.type}
                                        </Text>
                                        <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                                    </View>
                                    <Text style={[styles.txPoints, positive ? styles.txPos : styles.txNeg]}>
                                        {positive ? '+' : ''}{tx.points}
                                    </Text>
                                </View>
                            );
                        })}

                        {history.hasNextPage && (
                            <Pressable
                                style={styles.loadMore}
                                onPress={() => void history.fetchNextPage()}
                                disabled={history.isFetchingNextPage}
                            >
                                {history.isFetchingNextPage ? (
                                    <ActivityIndicator color={Colors.brand.primary} />
                                ) : (
                                    <Text style={styles.loadMoreText}>{t('trips.load_more')}</Text>
                                )}
                            </Pressable>
                        )}
                    </>
                )}

                <View style={{ height: Spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: Colors.background.secondary },
    scroll:      { padding: Spacing.lg, gap: Spacing.md },
    title:       { fontSize: 26, fontWeight: '800', color: Colors.text.primary },

    balanceCard: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: 6,
        ...Shadow.md,
    },
    balanceError:   { color: Colors.brand.onPrimary, fontWeight: '600' },
    balanceLabel:   { color: Colors.brand.onPrimary, fontSize: 13, fontWeight: '600' },
    balanceRow:     { flexDirection: 'row', alignItems: 'baseline' },
    balanceValue:   { color: '#fff', fontSize: 48, fontWeight: '800' },
    balanceUnit:    { color: Colors.brand.onPrimary, fontSize: 18 },
    balanceEquiv:   { color: Colors.brand.onPrimary, fontSize: 13, marginBottom: Spacing.sm },
    balanceStats:   {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.sm,
    },
    balanceStat:       { flex: 1, alignItems: 'center', gap: 2 },
    balanceStatValue:  { color: '#fff', fontWeight: '800', fontSize: 15 },
    balanceStatLabel:  { color: Colors.brand.onPrimary, fontSize: 10, textAlign: 'center' },
    balanceStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: Spacing.sm },

    howCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.sm,
        ...Shadow.sm,
    },
    howTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 14, marginBottom: 2 },
    howRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    howIcon:  { fontSize: 16, width: 24, textAlign: 'center' },
    howText:  { flex: 1, color: Colors.text.secondary, fontSize: 13 },

    referralCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: 6,
        ...Shadow.sm,
    },
    refTitle: { fontWeight: '700', color: Colors.text.primary, fontSize: 15 },
    refSub:   { color: Colors.text.tertiary, fontSize: 13 },
    refRow:   { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
    refCodeBox: {
        flex: 1,
        backgroundColor: Colors.background.secondary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    refCode:      { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: Colors.text.primary },
    refShare: {
        backgroundColor: Colors.brand.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    refShareText: { color: '#fff', fontWeight: '700' },

    sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.sm },

    loadingBox: { alignItems: 'center', padding: Spacing['2xl'] },
    errorBox:   { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
    errorText:  { color: Colors.text.secondary, fontWeight: '600' },
    retryText:  { color: Colors.brand.primary, fontWeight: '700' },
    emptyBox:   { alignItems: 'center', padding: Spacing['2xl'], gap: Spacing.md },
    emptyIcon:  { fontSize: 40 },
    emptyText:  { color: Colors.text.secondary, textAlign: 'center', fontSize: 14 },

    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.md,
        ...Shadow.sm,
    },
    txIconBox: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.background.secondary,
        alignItems: 'center', justifyContent: 'center',
    },
    txIcon:   { fontSize: 20 },
    txBody:   { flex: 1, gap: 2 },
    txLabel:  { color: Colors.text.primary, fontWeight: '600', fontSize: 14 },
    txDate:   { color: Colors.text.tertiary, fontSize: 12 },
    txPoints: { fontWeight: '800', fontSize: 16 },
    txPos:    { color: Colors.semantic.success },
    txNeg:    { color: Colors.semantic.error },

    loadMore:     { alignItems: 'center', padding: Spacing.lg },
    loadMoreText: { color: Colors.brand.primary, fontWeight: '700' },
});
