import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme';

type Props = {
  icon: string;
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
};

export function AddressSelectRow({
  icon,
  label,
  value,
  placeholder,
  onPress,
  disabled,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {value?.trim() || label}
        </Text>
        {value?.trim() ? (
          <Text style={styles.sub} numberOfLines={1}>
            {label}
          </Text>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
      </View>
      <Text style={[styles.select, disabled && styles.selectDisabled]}>Select</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 14,
    marginBottom: 12,
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 24 },
  body: { flex: 1, minWidth: 0 },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  select: {
    color: colors.primaryBright,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  selectDisabled: {
    color: colors.textMuted,
  },
});
