import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Card } from '../Card';
import { MenuItemCartControls } from './MenuItemCartControls';
import { MenuItemDetailModal } from './MenuItemDetailModal';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import type { MenuAddOn, MenuVariant, SpicyLevel } from '../../types/menu';
import { colors, radii, spacing } from '../../theme';

export type MenuItemCardData = {
  id: string;
  name: string;
  price: number;
  category: string;
  isVeg: boolean;
  imageUrl?: string | null;
  description?: string;
  preparationTimeMinutes?: number;
  calories?: number | null;
  spicyLevel?: SpicyLevel;
  variants?: MenuVariant[];
  addOns?: MenuAddOn[];
};

type Props = {
  item: MenuItemCardData;
  restaurantId: string;
  restaurantName: string;
};

export function MenuItemCard({ item, restaurantId, restaurantName }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const imageUri = resolveMediaUrl(item.imageUrl);

  return (
    <>
      <Card>
        <View style={styles.row}>
          <Pressable
            style={styles.tappable}
            onPress={() => setDetailOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${item.name}`}
          >
            <View style={styles.thumb}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
              ) : (
                <Text style={styles.placeholder}>🍽</Text>
              )}
            </View>
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.meta}>
                {item.isVeg ? '🟢' : '🔴'} {item.category}
              </Text>
              <Text style={styles.price}>₹{item.price}</Text>
            </View>
          </Pressable>
          <MenuItemCartControls
            menuItemId={item.id}
            name={item.name}
            price={item.price}
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            variants={item.variants ?? []}
            addOns={item.addOns ?? []}
          />
        </View>
      </Card>

      <MenuItemDetailModal
        visible={detailOpen}
        item={item}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tappable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: 28,
    opacity: 0.7,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  price: {
    color: colors.primaryBright,
    fontWeight: '800',
    fontSize: 16,
  },
});
