import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import type { AlertPayload, AlertButton, AlertVariant } from '../../store/alertStore';
import { colors, radii, spacing } from '../../theme';

type Props = {
  alert: AlertPayload;
  onDismiss: () => void;
  onButtonPress: (button: AlertButton) => void;
};

const VARIANT_META: Record<
  AlertVariant,
  { icon: string; accent: string; glow: string; label: string }
> = {
  info: {
    icon: '◆',
    accent: colors.primaryBright,
    glow: colors.primarySoft,
    label: 'Notice',
  },
  success: {
    icon: '✓',
    accent: '#4ade80',
    glow: 'rgba(74, 222, 128, 0.15)',
    label: 'Success',
  },
  error: {
    icon: '!',
    accent: colors.error,
    glow: 'rgba(248, 113, 113, 0.14)',
    label: 'Error',
  },
  warning: {
    icon: '⚠',
    accent: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.14)',
    label: 'Confirm',
  },
};

export function AlertMessageCard({ alert, onDismiss, onButtonPress }: Props) {
  const meta = VARIANT_META[alert.variant];
  const buttons = alert.buttons;
  const useRow = buttons.length === 2;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.glow, { shadowColor: meta.accent }]}>
              <View style={[styles.card, { borderColor: `${meta.accent}55` }]}>
                <View style={[styles.iconRing, { backgroundColor: meta.glow, borderColor: `${meta.accent}66` }]}>
                  <Text style={[styles.icon, { color: meta.accent }]}>{meta.icon}</Text>
                </View>
                <Text style={[styles.badge, { color: meta.accent }]}>{meta.label}</Text>
                <Text style={styles.title}>{alert.title}</Text>
                {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
                <View style={[styles.actions, useRow && styles.actionsRow]}>
                  {buttons.map((button, index) => {
                    const isCancel = button.style === 'cancel';
                    const isDestructive = button.style === 'destructive';
                    const isPrimary =
                      !isCancel &&
                      (buttons.length === 1 ||
                        index === buttons.length - 1 ||
                        (!useRow && index === buttons.length - 1));

                    return (
                      <Pressable
                        key={`${button.text}-${index}`}
                        onPress={() => onButtonPress(button)}
                        style={({ pressed }) => [
                          styles.btn,
                          useRow && styles.btnFlex,
                          isPrimary && styles.btnPrimary,
                          isCancel && styles.btnCancel,
                          isDestructive && styles.btnDestructive,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        {isPrimary ? <View style={styles.btnSheen} pointerEvents="none" /> : null}
                        <Text
                          style={[
                            styles.btnText,
                            isPrimary && styles.btnTextPrimary,
                            isCancel && styles.btnTextCancel,
                            isDestructive && styles.btnTextDestructive,
                          ]}
                        >
                          {button.text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  glow: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.xl + 2,
    padding: 1.5,
    backgroundColor: 'rgba(168, 85, 247, 0.35)',
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  iconRing: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 22,
    fontWeight: '800',
  },
  badge: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 48,
  },
  btnFlex: { flex: 1 },
  btnPrimary: {
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.primaryBright,
  },
  btnCancel: {
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  btnDestructive: {
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  btnSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  btnText: { fontSize: 15, fontWeight: '700' },
  btnTextPrimary: { color: colors.text, fontWeight: '800' },
  btnTextCancel: { color: colors.lavender },
  btnTextDestructive: { color: colors.error, fontWeight: '800' },
});
