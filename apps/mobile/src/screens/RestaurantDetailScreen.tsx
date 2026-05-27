import React, { useLayoutEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { HomeStackProps } from '../navigation/types';
import { api } from '../api/client';
import { MenuItemCard, type MenuItemCardData } from '../components/food/MenuItemCard';
import { useCartStore } from '../store/cartStore';
import { colors } from '../theme';
import { shared } from '../theme/styles';
import { useAppInsets } from '../hooks/useAppInsets';

type RestDetail = {
  id: string;
  name: string;
  menu: MenuItemCardData[];
  isOpenNow?: boolean;
  canOrder?: boolean;
  availabilityLabel?: string | null;
};

type Props = HomeStackProps<'RestaurantDetail'>;

export function RestaurantDetailScreen({ navigation, route }: Props) {
  const inset = useAppInsets({ header: true });
  const { id, title } = route.params;
  const setRestaurant = useCartStore((s) => s.setRestaurant);
  const cartItems = useCartStore((s) => s.items);
  const cartRestaurantId = useCartStore((s) => s.restaurantId);

  const cartCount =
    cartRestaurantId === id ? cartItems.reduce((sum, line) => sum + line.quantity, 0) : 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: async () => {
      const { data: r } = await api.get<RestDetail>(`/restaurants/${id}`);
      return r;
    },
  });

  useLayoutEffect(() => {
    const screenTitle = title ?? data?.name ?? 'Menu';
    navigation.setOptions({
      title: screenTitle,
      headerRight:
        cartCount > 0
          ? () => (
              <Pressable
                onPress={() => {
                  setRestaurant(id, data?.name ?? title ?? 'Restaurant');
                  navigation.navigate('Cart');
                }}
                style={styles.cartHeaderBtn}
                hitSlop={10}
                accessibilityLabel={`Cart, ${cartCount} items`}
              >
                <Text style={styles.cartIcon}>🛒</Text>
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, title, data?.name, id, cartCount, setRestaurant, data?.name]);

  if (isLoading) {
    return (
      <View style={shared.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={shared.center}>
        <Text style={shared.err}>{error instanceof Error ? error.message : 'Not found'}</Text>
      </View>
    );
  }

  const canOrder = data.canOrder !== false;
  const closedBanner = !canOrder ? data.availabilityLabel : null;

  return (
    <FlatList
      contentContainerStyle={[inset.listContent, { paddingBottom: inset.bottom + 16 }]}
      data={data.menu}
      keyExtractor={(item) => item.id}
      extraData={cartItems}
      ListHeaderComponent={
        closedBanner ? (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerText}>{closedBanner}</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <MenuItemCard
          item={item}
          restaurantId={data.id}
          restaurantName={data.name}
          orderingEnabled={canOrder}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  closedBanner: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  closedBannerText: {
    color: colors.lavender,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  cartHeaderBtn: {
    marginRight: 4,
    padding: 6,
    position: 'relative',
  },
  cartIcon: {
    fontSize: 22,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryBright,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
});
