import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type Props = {
  label: string;
  done?: boolean;
  optional?: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function DriverDocUploadRow({ label, done, optional, onPress, disabled }: Props) {
  return (
    <Pressable
      style={[styles.row, done && styles.rowDone]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.badge, done && styles.badgeDone]}>
        <Text style={styles.badgeText}>{done ? '✓' : '↑'}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.label}>{label}</Text>
        {optional ? <Text style={styles.opt}>Optional</Text> : null}
      </View>
      <Text style={styles.action}>{done ? 'Uploaded' : 'Upload'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  rowDone: { opacity: 0.92 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeDone: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  badgeText: { color: colors.text, fontWeight: '800' },
  mid: { flex: 1 },
  label: { color: colors.text, fontWeight: '600' },
  opt: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  action: { color: colors.primaryBright, fontWeight: '700', fontSize: 13 },
});
