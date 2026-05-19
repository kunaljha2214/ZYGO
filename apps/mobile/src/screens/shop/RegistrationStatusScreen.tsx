import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { AuthHeroCard } from '../../components/auth/AuthHeroCard';
import { RegistrationLogoutButton } from '../../components/auth/RegistrationLogoutButton';
import { colors, radii } from '../../theme';
import type { OwnerRestaurantRegistration } from '../../types/shopOwner';

type Props = {
  registration: OwnerRestaurantRegistration;
  onEdit: () => void;
  onRefresh: () => void;
};

export function RegistrationStatusScreen({ registration, onEdit, onRefresh }: Props) {
  const pending = registration.approvalStatus === 'pending_review';
  const rejected = registration.approvalStatus === 'rejected';
  const approved = registration.approvalStatus === 'approved';

  return (
    <AppScreen scroll tab>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Restaurant registration</Text>
        <RegistrationLogoutButton />
      </View>
      <Text style={styles.sub}>
        {pending && 'Your application is under admin review. KYC verification is in progress.'}
        {rejected && 'Your application was rejected. Update details and submit again.'}
        {approved && 'Your restaurant is approved. Open the Menu tab to add dishes for customers.'}
      </Text>

      <AuthHeroCard compact>
        <View style={[styles.badge, pending && styles.badgePending, rejected && styles.badgeRejected, approved && styles.badgeOk]}>
          <Text style={styles.badgeText}>
            {pending ? 'Pending approval' : rejected ? 'Rejected' : 'Approved'}
          </Text>
        </View>

        <Text style={styles.label}>Restaurant</Text>
        <Text style={styles.value}>{registration.name}</Text>

        <Text style={styles.label}>KYC status</Text>
        <Text style={styles.value}>{registration.kycStatus.replace('_', ' ')}</Text>

        {registration.submittedAt ? (
          <>
            <Text style={styles.label}>Submitted</Text>
            <Text style={styles.value}>{new Date(registration.submittedAt).toLocaleString()}</Text>
          </>
        ) : null}

        {rejected && registration.rejectionReason ? (
          <>
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.valueErr}>{registration.rejectionReason}</Text>
          </>
        ) : null}
      </AuthHeroCard>

      {rejected ? (
        <Pressable style={styles.primaryBtn} onPress={onEdit}>
          <Text style={styles.primaryBtnText}>Edit & resubmit</Text>
        </Pressable>
      ) : null}

      {pending ? (
        <Pressable style={styles.secondaryBtn} onPress={onRefresh}>
          <Text style={styles.secondaryBtnText}>Refresh status</Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8},
  title: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: 16},
  badgePending: { backgroundColor: 'rgba(234, 179, 8, 0.2)' },
  badgeRejected: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  badgeOk: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  badgeText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4},
  value: { color: colors.text, fontSize: 16, fontWeight: '600' },
  valueErr: { color: colors.error, fontSize: 15, lineHeight: 22 },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center'},
  primaryBtnText: { color: colors.text, fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder},
  secondaryBtnText: { color: colors.primaryBright, fontWeight: '700', fontSize: 15 }});
