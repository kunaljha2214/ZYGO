import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import type { DriverApprovalStatus } from '../../types/driver';

type Props = {
  status: DriverApprovalStatus;
  label?: string;
};

export function DriverApprovalBadge({ status, label }: Props) {
  const display = label ?? status.toUpperCase();
  return (
    <Text
      style={[
        styles.badge,
        status === 'pending' && styles.pending,
        status === 'approved' && styles.approved,
        status === 'rejected' && styles.rejected,
        status === 'blocked' && styles.blocked,
      ]}
    >
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    fontWeight: '800',
    fontSize: 13,
    overflow: 'hidden',
    color: colors.badgeText,
    backgroundColor: colors.badge,
  },
  pending: { backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' },
  approved: { backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' },
  rejected: { backgroundColor: 'rgba(248, 113, 113, 0.15)', color: colors.error },
  blocked: { backgroundColor: 'rgba(248, 113, 113, 0.25)', color: '#fca5a5' },
});
