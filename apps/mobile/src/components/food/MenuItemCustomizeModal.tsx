import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import type { MenuAddOn, MenuVariant } from '../../types/menu';
import { colors, radii, spacing } from '../../theme';

export type CustomizeSelection = {
  variantName?: string;
  addOnNames: string[];
  price: number;
  displayName: string;
};

type Props = {
  visible: boolean;
  itemName: string;
  basePrice: number;
  variants: MenuVariant[];
  addOns: MenuAddOn[];
  onClose: () => void;
  onConfirm: (selection: CustomizeSelection) => void;
};

export function MenuItemCustomizeModal({
  visible,
  itemName,
  basePrice,
  variants,
  addOns,
  onClose,
  onConfirm,
}: Props) {
  const activeVariants = variants.filter((v) => v.name.trim() && v.price > 0);
  const hasVariants = activeVariants.length > 0;
  const hasAddOns = addOns.length > 0;

  const [step, setStep] = useState<'variant' | 'addons'>('variant');
  const [variantName, setVariantName] = useState<string | undefined>(activeVariants[0]?.name);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setVariantName(activeVariants[0]?.name);
    setSelectedAddOns([]);
    setStep(hasVariants ? 'variant' : 'addons');
  }, [visible, itemName, hasVariants]);

  const selectedVariant = activeVariants.find((v) => v.name === variantName);
  const variantPrice = selectedVariant?.price ?? basePrice;

  const addOnTotal = addOns
    .filter((a) => selectedAddOns.includes(a.name))
    .reduce((sum, a) => sum + a.price, 0);

  const unitPrice = variantPrice + addOnTotal;

  const buildDisplayName = () => {
    let label = itemName;
    if (selectedVariant) label += ` (${selectedVariant.name})`;
    const picked = addOns.filter((a) => selectedAddOns.includes(a.name));
    if (picked.length > 0) label += ` + ${picked.map((a) => a.name).join(', ')}`;
    return label;
  };

  const finish = () => {
    onConfirm({
      variantName: selectedVariant?.name,
      addOnNames: selectedAddOns,
      price: unitPrice,
      displayName: buildDisplayName(),
    });
    onClose();
  };

  const onVariantContinue = () => {
    if (hasVariants && !selectedVariant) return;
    if (hasAddOns) {
      setStep('addons');
      return;
    }
    finish();
  };

  const toggleAddOn = (name: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const goBack = () => {
    if (step === 'addons' && hasVariants) {
      setStep('variant');
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <Text style={styles.title}>{itemName}</Text>

              {step === 'variant' ? (
                <>
                  <Text style={styles.section}>Choose size</Text>
                  <View style={styles.chipRow}>
                    {activeVariants.map((v) => {
                      const on = v.name === variantName;
                      return (
                        <Pressable
                          key={v.name}
                          style={[styles.chip, on && styles.chipOn]}
                          onPress={() => setVariantName(v.name)}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{v.name}</Text>
                          <Text style={[styles.chipPrice, on && styles.chipTextOn]}>₹{v.price}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    style={[styles.primaryBtn, !selectedVariant && styles.primaryBtnDisabled]}
                    onPress={onVariantContinue}
                    disabled={!selectedVariant}
                  >
                    <Text style={styles.primaryBtnText}>
                      {hasAddOns ? 'Continue' : `Add · ₹${variantPrice}`}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {hasVariants && selectedVariant ? (
                    <Text style={styles.selectedSize}>
                      Size: {selectedVariant.name} · ₹{selectedVariant.price}
                    </Text>
                  ) : null}
                  <Text style={styles.section}>Add-ons (optional)</Text>
                  <ScrollView style={styles.addOnList} nestedScrollEnabled>
                    {addOns.map((a) => {
                      const on = selectedAddOns.includes(a.name);
                      return (
                        <Pressable
                          key={a.name}
                          style={[styles.addOnRow, on && styles.addOnRowOn]}
                          onPress={() => toggleAddOn(a.name)}
                        >
                          <Text style={styles.addOnName}>{a.name}</Text>
                          <Text style={styles.addOnPrice}>+₹{a.price}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <View style={styles.footerRow}>
                    {hasVariants ? (
                      <Pressable style={styles.secondaryBtn} onPress={goBack}>
                        <Text style={styles.secondaryBtnText}>Back</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.primaryBtn, styles.primaryBtnFlex]}
                      onPress={finish}
                    >
                      <Text style={styles.primaryBtnText}>Add · ₹{unitPrice}</Text>
                    </Pressable>
                  </View>
                </>
              )}
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  section: {
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  selectedSize: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 88,
    alignItems: 'center',
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontWeight: '600', color: colors.text },
  chipTextOn: { color: colors.primary },
  chipPrice: { marginTop: 4, fontSize: 13, color: colors.textSecondary },
  addOnList: { maxHeight: 220, marginBottom: spacing.md },
  addOnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    marginBottom: spacing.sm,
  },
  addOnRowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addOnName: { color: colors.text, fontWeight: '600' },
  addOnPrice: { color: colors.primary, fontWeight: '700' },
  footerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnFlex: { flex: 1, marginTop: 0 },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    justifyContent: 'center',
  },
  secondaryBtnText: { color: colors.textSecondary, fontWeight: '700' },
});
