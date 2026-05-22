import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Button } from '../Button';
import { ZygoCalendarPicker } from './ZygoCalendarPicker';
import { colors } from '../../theme';
import {
  birthDateLimits,
  formatBirthDateDisplay,
  formatBirthDateForApi,
} from '../../utils/dateOfBirth';

type Props = {
  visible: boolean;
  initialDate: Date;
  saving?: boolean;
  onCancel: () => void;
  onSave: (apiValue: string) => void;
};

export function DobPickerSheet({
  visible,
  initialDate,
  saving,
  onCancel,
  onSave,
}: Props) {
  const { minimumDate, maximumDate } = birthDateLimits();
  const [selected, setSelected] = useState(initialDate);

  React.useEffect(() => {
    if (visible) {
      setSelected(initialDate);
    }
  }, [visible, initialDate]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.backdrop} onPress={() => !saving && onCancel()}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Date of birth</Text>
          <Text style={styles.label}>SELECT DATE</Text>
          <View style={styles.selectedWrap}>
            <Text style={styles.selectedDate}>{formatBirthDateDisplay(selected)}</Text>
          </View>

          <ZygoCalendarPicker
            value={selected}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={setSelected}
          />

          <Text style={styles.note}>You can set this only once.</Text>

          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={onCancel} disabled={saving} />
            <Button
              title="Save"
              onPress={() => onSave(formatBirthDateForApi(selected))}
              loading={saving}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  label: {
    color: colors.primaryBright,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  selectedWrap: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  selectedDate: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
