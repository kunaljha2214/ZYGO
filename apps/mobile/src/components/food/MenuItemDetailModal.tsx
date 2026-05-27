import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { MenuItemCartControls } from './MenuItemCartControls';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import type { MenuItemCardData } from './MenuItemCard';
import type { SpicyLevel } from '../../types/menu';
import { colors, radii, spacing } from '../../theme';

const SPICY_LABELS = ['None', 'Mild', 'Medium', 'Hot'] as const;

type Props = {
  visible: boolean;
  item: MenuItemCardData;
  restaurantId: string;
  restaurantName: string;
  orderingEnabled?: boolean;
  onClose: () => void;
};

function formatPrice(item: MenuItemCardData): string {
  const active = (item.variants ?? []).filter((v) => v.name.trim() && v.price > 0);
  if (active.length === 0) return `₹${item.price}`;
  const prices = active.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `₹${min}`;
  return `₹${min} – ₹${max}`;
}

function DietaryBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <View style={[styles.dietBox, isVeg ? styles.dietVeg : styles.dietNonVeg]}>
      <View style={[styles.dietMark, isVeg ? styles.dietMarkVeg : styles.dietMarkNonVeg]} />
    </View>
  );
}

export function MenuItemDetailModal({
  visible,
  item,
  restaurantId,
  restaurantName,
  orderingEnabled = true,
  onClose,
}: Props) {
  const { width } = useWindowDimensions();
  const imageUri = resolveMediaUrl(item.imageUrl);
  const priceLabel = useMemo(() => formatPrice(item), [item]);
  const hasVariants = (item.variants ?? []).some((v) => v.name.trim() && v.price > 0);
  const hasAddOns = (item.addOns ?? []).length > 0;
  const spicyLabel =
    item.spicyLevel != null && item.spicyLevel > 0
      ? SPICY_LABELS[item.spicyLevel as SpicyLevel]
      : null;

  const prep = item.preparationTimeMinutes;
  const calories = item.calories;
  const description = item.description?.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { maxHeight: '92%' }]}>
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={[styles.hero, { width }]}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.heroPlaceholder}>
                      <Text style={styles.heroPlaceholderIcon}>🍽</Text>
                    </View>
                  )}
                  <View style={styles.closeBtnWrap} pointerEvents="box-none">
                    <Pressable
                      style={styles.closeBtn}
                      onPress={onClose}
                      accessibilityLabel="Close"
                      hitSlop={12}
                    >
                      <Text style={styles.closeBtnText}>✕</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.body}>
                  <View style={styles.headerBlock}>
                    <View style={styles.titleRow}>
                      <View style={styles.infoCol}>
                        <View style={styles.nameRow}>
                          <DietaryBadge isVeg={item.isVeg} />
                          <Text style={styles.title} numberOfLines={3}>
                            {item.name}
                          </Text>
                        </View>
                        <Text style={[styles.price, !hasVariants && styles.priceBeforeMeta]}>
                          {priceLabel}
                        </Text>
                        {hasVariants ? (
                          <Text style={styles.priceHint}>Base price · sizes may vary</Text>
                        ) : null}
                      </View>
                      <View style={styles.addCol}>
                        {orderingEnabled ? (
                          <MenuItemCartControls
                            menuItemId={item.id}
                            name={item.name}
                            price={item.price}
                            restaurantId={restaurantId}
                            restaurantName={restaurantName}
                            variants={item.variants ?? []}
                            addOns={item.addOns ?? []}
                          />
                        ) : null}
                        {hasVariants || hasAddOns ? (
                          <Text style={styles.customizeLabel}>Customisable</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    {prep != null && prep > 0 ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>⏱ {prep} min</Text>
                      </View>
                    ) : null}
                    {calories != null && calories > 0 ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>🔥 {calories} kcal</Text>
                      </View>
                    ) : null}
                    {item.category ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>{item.category}</Text>
                      </View>
                    ) : null}
                    {spicyLabel ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>🌶 {spicyLabel}</Text>
                      </View>
                    ) : null}
                  </View>

                  {description ? (
                    <Text style={styles.description}>{description}</Text>
                  ) : (
                    <Text style={styles.noDescription}>No description provided.</Text>
                  )}
                </View>
              </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    height: 220,
    backgroundColor: colors.inputBg,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderIcon: {
    fontSize: 56,
    opacity: 0.5,
  },
  closeBtnWrap: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  headerBlock: {
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  addCol: {
    flexShrink: 0,
    paddingTop: 2,
    alignItems: 'center',
    maxWidth: 96,
  },
  customizeLabel: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  dietBox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  dietVeg: { borderColor: '#22c55e' },
  dietNonVeg: { borderColor: '#ef4444' },
  dietMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dietMarkVeg: { backgroundColor: '#22c55e' },
  dietMarkNonVeg: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ef4444',
    borderRadius: 0,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 23,
    minWidth: 0,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryBright,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  priceBeforeMeta: {
    marginBottom: spacing.sm,
  },
  priceHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  metaChipText: {
    color: colors.lavender,
    fontWeight: '600',
    fontSize: 13,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  noDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
