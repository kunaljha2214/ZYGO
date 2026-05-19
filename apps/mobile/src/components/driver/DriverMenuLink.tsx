import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';

type Props = {
  icon: string;
  label: string;
  hint?: string;
  onPress: () => void;
};

export function DriverMenuLink({ icon, label, hint, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  icon: { fontSize: 22, marginRight: spacing.md },
  text: { flex: 1 },
  label: { color: colors.text, fontWeight: '700', fontSize: 16 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chevron: { color: colors.primaryBright, fontSize: 28, fontWeight: '300' },
});
