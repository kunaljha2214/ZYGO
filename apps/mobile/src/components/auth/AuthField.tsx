import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

type Props = {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  dense?: boolean;
  large?: boolean;
};

export function AuthField({ label, children, style, dense, large }: Props) {
  return (
    <View style={[styles.wrap, dense && styles.wrapDense, large && styles.wrapLarge, style]}>
      <Text style={[styles.label, dense && styles.labelDense, large && styles.labelLarge]}>
        {label}
      </Text>
      <View style={[styles.field, dense && styles.fieldDense, large && styles.fieldLarge]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  wrapDense: { marginBottom: 8 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  labelDense: { marginBottom: 4, fontSize: 9 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minHeight: 52,
    paddingHorizontal: 12,
    gap: 10,
  },
  fieldDense: {
    minHeight: 42,
    paddingHorizontal: 10,
    gap: 8,
  },
  wrapLarge: { marginBottom: 18 },
  labelLarge: { fontSize: 11, marginBottom: 10 },
  fieldLarge: {
    minHeight: 56,
    paddingHorizontal: 14,
    gap: 12,
    borderRadius: radii.lg,
  },
});

export function FieldIcon({ children }: { children: ReactNode }) {
  return <View style={iconStyles.wrap}>{children}</View>;
}

const iconStyles = StyleSheet.create({
  wrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
