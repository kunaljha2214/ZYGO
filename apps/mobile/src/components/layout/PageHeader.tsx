import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { type } from '../../theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
};

export function PageHeader({ title, subtitle, eyebrow }: Props) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={type.label}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    ...type.subtitle,
    marginTop: spacing.sm,
  },
});
