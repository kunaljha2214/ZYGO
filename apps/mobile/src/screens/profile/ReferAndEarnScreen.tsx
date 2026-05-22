import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Share, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { GlassCard } from '../../components/neon/GlassCard';
import { Button } from '../../components/Button';
import { fetchMyReferral, type ReferralSummary } from '../../api/referrals';
import { colors, radii } from '../../theme';
import { formatInr } from '../../utils/formatMoney';

export function ReferAndEarnScreen() {
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    void fetchMyReferral()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Could not load referral'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onShare() {
    if (!data) return;
    try {
      await Share.share({ message: data.shareMessage, title: 'Invite to Zygo' });
    } catch {
      /* cancelled */
    }
  }

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} size="large" />
      </View>
    );
  }

  if (err && !data) {
    return (
      <StackScroll>
        <Text style={styles.err}>{err}</Text>
        <Button title="Retry" onPress={load} />
      </StackScroll>
    );
  }

  if (!data) return null;

  return (
    <StackScroll>
      <GlassCard glow style={styles.hero}>
        <Text style={styles.heroTitle}>Refer & earn</Text>
        <Text style={styles.heroSub}>
          Share Zygo. When someone signs up with your code, ₹{data.rewardAmount} is added to your
          wallet.
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Your referral code</Text>
          <Text style={styles.code} selectable>
            {data.referralCode}
          </Text>
        </View>
        <Button title="Share invite" onPress={() => void onShare()} />
      </GlassCard>

      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>{formatInr(data.walletBalance)}</Text>
          <Text style={styles.statLabel}>Referral wallet</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>{data.totalReferrals}</Text>
          <Text style={styles.statLabel}>Friends joined</Text>
        </GlassCard>
      </View>

      <Text style={styles.section}>How it works</Text>
      <GlassCard>
        <Text style={styles.step}>1. Tap Share invite and send your code to friends.</Text>
        <Text style={styles.step}>2. They install Zygo and enter {data.referralCode} when signing up.</Text>
        <Text style={styles.step}>
          3. You get ₹{data.rewardAmount} in your wallet after they verify their account.
        </Text>
      </GlassCard>

      <Text style={styles.section}>Referral history</Text>
      {data.history.length === 0 ? (
        <Text style={styles.empty}>No referrals yet — share your code to start earning.</Text>
      ) : (
        <FlatList
          data={data.history}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GlassCard style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{item.referredName}</Text>
                  <Text style={styles.historyPhone}>{item.referredPhone}</Text>
                </View>
                <Text style={styles.historyAmount}>+{formatInr(item.amount)}</Text>
              </View>
            </GlassCard>
          )}
        />
      )}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  err: { color: colors.error, marginBottom: 12 },
  hero: { marginBottom: 16 },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroSub: { color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  codeBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  codeLabel: { color: colors.lavender, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  code: { color: colors.primaryBright, fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { color: colors.primaryBright, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  step: { color: colors.textSecondary, lineHeight: 22, marginBottom: 10 },
  empty: { color: colors.textMuted, marginBottom: 24 },
  historyCard: { marginBottom: 8, padding: 14 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  historyPhone: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  historyAmount: { color: '#4ade80', fontWeight: '800', fontSize: 16 },
});
