import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
};

/** Back + title for stack screens without native header. */
export function StackBackHeader({ title, subtitle }: Props) {
  const navigation = useNavigation();

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        hitSlop={12}
      >
        <Text style={styles.backIcon}>←</Text>
      </Pressable>
      <View style={styles.titles}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  pressed: { opacity: 0.85 },
  backIcon: { color: colors.primaryBright, fontSize: 22, fontWeight: '700' },
  titles: { flex: 1 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});
