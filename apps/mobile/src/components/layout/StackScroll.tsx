import React, { type ReactNode } from 'react';
import {
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppInsets } from '../../hooks/useAppInsets';
import { spacing } from '../../theme/spacing';

type Props = ScrollViewProps & {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

/** ScrollView for stack screens with a native header — safe area + Stitch gutters. */
export function StackScroll({ children, contentStyle, ...rest }: Props) {
  const inset = useAppInsets({ header: true });
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, inset.scrollContent, contentStyle]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.stackGap },
});
