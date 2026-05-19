import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import { RegistrationLogoutButton } from '../../components/auth/RegistrationLogoutButton';
import { DriverApprovalBadge } from '../../components/driver/DriverApprovalBadge';
import type { DriverProfile } from '../../types/driver';
import { colors, radii, spacing } from '../../theme';

type Props = {
  profile: DriverProfile;
  onEdit: () => void;
  onRefresh: () => void;
};

export function DriverStatusScreen({ profile, onEdit, onRefresh }: Props) {
  const pending = profile.approvalStatus === 'pending';
  const rejected = profile.approvalStatus === 'rejected';
  const blocked = profile.approvalStatus === 'blocked';

  return (
    <AppScreen scroll tab eyebrow="Verification" title="Application status">
      <RegistrationLogoutButton />
      <Text style={styles.sub}>
        {pending && 'Your documents are under admin review. You can go online after approval.'}
        {rejected && 'Application rejected. Update documents and submit again.'}
        {blocked && 'Your account has been blocked. Contact support for help.'}
      </Text>
      <AuthHeroCard compact>
        <DriverApprovalBadge status={profile.approvalStatus} label={profile.approvalLabel} />
        {profile.vehicleModel ? (
          <Text style={styles.vehicle}>
            {profile.vehicleModel} · {profile.vehicleNumber}
          </Text>
        ) : null}
        {profile.submittedAt ? (
          <Text style={styles.meta}>Submitted {new Date(profile.submittedAt).toLocaleString()}</Text>
        ) : null}
        {(rejected || blocked) && profile.rejectionReason ? (
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
  sub: { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 22 },
  vehicle: { color: colors.text, fontWeight: '600', marginTop: spacing.md },
  meta: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
  reason: { color: colors.error, marginTop: spacing.md, lineHeight: 20 },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center'},
  btnText: { color: colors.text, fontWeight: '800' },
  secondary: { marginTop: spacing.lg, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: colors.primaryBright, fontWeight: '700' }});
