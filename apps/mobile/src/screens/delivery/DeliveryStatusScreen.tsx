import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import { RegistrationLogoutButton } from '../../components/auth/RegistrationLogoutButton';
import type { DeliveryPartnerProfile } from '../../types/deliveryPartner';
import { colors, radii, spacing } from '../../theme';

type Props = {
  profile: DeliveryPartnerProfile;
  onEdit: () => void;
  onRefresh: () => void;
};

export function DeliveryStatusScreen({ profile, onEdit, onRefresh }: Props) {
  const pending = profile.approvalStatus === 'pending_review';
  const rejected = profile.approvalStatus === 'rejected';

  return (
    <AppScreen scroll tab>
      <RegistrationLogoutButton />
      <Text style={styles.title}>Partner verification</Text>
      <Text style={styles.sub}>
        {pending && 'Documents are under admin review. You can go online after approval.'}
        {rejected && 'Application rejected. Update documents and submit again.'}
      </Text>
      <AuthHeroCard compact>
        <Text style={[styles.badge, pending && styles.pending, rejected && styles.rejected]}>
          {pending ? 'Pending approval' : 'Rejected'}
        </Text>
        {profile.submittedAt ? (
          <Text style={styles.meta}>Submitted {new Date(profile.submittedAt).toLocaleString()}</Text>
        ) : null}
        {rejected && profile.rejectionReason ? (
          <Text style={styles.reason}>{profile.rejectionReason}</Text>
        ) : null}
      </AuthHeroCard>
      {rejected ? (
        <Pressable style={styles.btn} onPress={onEdit}>
          <Text style={styles.btnText}>Edit & resubmit</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.secondary} onPress={onRefresh}>
          <Text style={styles.secondaryText}>Refresh status</Text>
        </Pressable>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { color: colors.textSecondary, marginVertical: spacing.md },
  badge: { fontWeight: '800', fontSize: 16, color: colors.primaryBright },
  pending: { color: '#fbbf24' },
  rejected: { color: colors.error },
  meta: { color: colors.textMuted, marginTop: spacing.sm },
  reason: { color: colors.error, marginTop: spacing.md },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center'},
  btnText: { color: colors.text, fontWeight: '800' },
  secondary: { marginTop: spacing.lg, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: colors.primaryBright, fontWeight: '700' }});
