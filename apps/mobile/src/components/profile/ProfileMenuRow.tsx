import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme';

type Props = {
  icon: string;
  label: string;
  subtitle?: string;
  showChevron?: boolean;
  onPress?: () => void;
  isLast?: boolean;
};

export function ProfileMenuRow({
  icon,
  label,
  subtitle,
  showChevron = true,
  onPress,
  isLast,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed, isLast && styles.rowLast]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showChevron && onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  pressed: { opacity: 0.75 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 18 },
  textCol: { flex: 1 },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
});
