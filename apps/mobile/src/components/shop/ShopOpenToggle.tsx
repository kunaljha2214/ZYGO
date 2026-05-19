import React from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type Props = {
  isOpen: boolean;
  loading?: boolean;
  onToggle: (open: boolean) => void;
};

export function ShopOpenToggle({ isOpen, loading, onToggle }: Props) {
  return (
    <View style={[styles.wrap, isOpen && styles.wrapOn]}>
      <View style={styles.textCol}>
        <View style={styles.dotRow}>
          <View style={[styles.dot, isOpen && styles.dotOn]} />
          <Text style={styles.label}>{isOpen ? 'Shop is open' : 'Shop is closed'}</Text>
        </View>
        <Text style={styles.hint}>
          {isOpen
            ? 'Customers can browse your menu and place orders.'
            : 'You are hidden from customers and cannot receive new orders.'}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Switch
          value={isOpen}
          onValueChange={onToggle}
          trackColor={{ false: colors.chip, true: colors.primary }}
          thumbColor={colors.text}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  wrapOn: {
    borderColor: colors.primary,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  textCol: { flex: 1 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  dotOn: { backgroundColor: '#4ade80' },
  label: { color: colors.text, fontWeight: '800', fontSize: 16 },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
});
