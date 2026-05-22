import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme';

type Props = {
  icon: string;
  label: string;
  value?: string | null;
  required?: boolean;
  editable?: boolean;
  actionLabel?: string;
  onPress?: () => void;
  isLast?: boolean;
};

export function ProfileDetailRow({
  icon,
  label,
  value,
  required,
  editable,
  actionLabel,
  onPress,
  isLast,
}: Props) {
  const showValue = value?.trim();
  const showRequired = required && !showValue;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && onPress && styles.pressed,
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        {showRequired ? (
          <Text style={styles.required}>Required</Text>
        ) : showValue ? (
          <Text style={styles.value}>{showValue}</Text>
        ) : null}
      </View>
      {actionLabel && onPress ? (
        <Text style={styles.action}>{actionLabel}</Text>
      ) : editable && onPress ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  pressed: { opacity: 0.85 },
  icon: { fontSize: 22, width: 36, textAlign: 'center' },
  body: { flex: 1, minWidth: 0 },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  value: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 4,
  },
  required: {
    color: '#d97706',
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
  action: {
    color: colors.primaryBright,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});
