import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  ACTIVITY_PERIOD_OPTIONS,
  type ActivityPeriodDays,
} from '../../hooks/useHomePulse';
import { colors, radii } from '../../theme';

type Props = {
  value: ActivityPeriodDays;
  onChange: (days: ActivityPeriodDays) => void;
  disabled?: boolean;
};

export function ActivityPeriodDropdown({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = ACTIVITY_PERIOD_OPTIONS.find((o) => o.days === value)?.label ?? '7 days';

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        hitSlop={8}
      >
        <Text style={styles.triggerText}>{selected}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.menu}>
                <Text style={styles.menuTitle}>Time period</Text>
                {ACTIVITY_PERIOD_OPTIONS.map((opt) => {
                  const active = opt.days === value;
                  return (
                    <Pressable
                      key={opt.days}
                      style={[styles.option, active && styles.optionActive]}
                      onPress={() => {
                        onChange(opt.days);
                        setOpen(false);
                      }}
                    >
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      {active ? <Text style={styles.check}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    backgroundColor: colors.chip,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { fontSize: 12, fontWeight: '700', color: colors.primaryBright },
  chevron: { fontSize: 10, color: colors.primaryBright, marginTop: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 120,
    paddingRight: 16,
  },
  menu: {
    minWidth: 160,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  menuTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionTextActive: { color: colors.lavender },
  check: { fontSize: 14, color: colors.primaryBright, fontWeight: '800' },
});
