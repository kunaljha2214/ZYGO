import React, { type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../theme';
import { useAppInsets } from '../hooks/useAppInsets';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  keyboard?: boolean;
  /** Auth sign-in / sign-up only */
  auth?: boolean;
  /** Bottom tab root — slightly more top padding */
  tab?: boolean;
  /** Native stack header visible — less top inset */
  header?: boolean;
};

export function ScreenShell({
  children,
  scroll,
  contentStyle,
  keyboard,
  auth,
  tab,
  header,
}: Props) {
  const inset = useAppInsets({ tab, header });

  const padStyle: ViewStyle = auth
    ? { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }
    : {
        paddingHorizontal: inset.horizontal,
        paddingTop: inset.top,
        paddingBottom: inset.bottom,
      };

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scroll, padStyle, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, styles.noScroll, padStyle, contentStyle]}>{children}</View>
  );

  const inner = (
    <View style={styles.flex}>
      <View style={styles.mesh} pointerEvents="none">
        <View style={[styles.orbTop, auth && styles.orbTopAuth]} />
        <View style={styles.orbMid} />
        <View style={styles.orbBottom} />
        <View style={styles.grid} />
      </View>
      {body}
    </View>
  );

  if (keyboard) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {inner}
      </KeyboardAvoidingView>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  noScroll: { flex: 1 },
  mesh: { ...StyleSheet.absoluteFill },
  orbTop: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primaryGlow,
    opacity: 0.35,
  },
  orbTopAuth: {
    top: 40,
    right: -80,
    width: 200,
    height: 200,
    opacity: 0.22,
  },
  orbMid: {
    position: 'absolute',
    top: '38%',
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    opacity: 0.5,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -40,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primarySoft,
    opacity: 0.45,
  },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '55%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 85, 247, 0.06)',
    opacity: 0.8,
  },
});
