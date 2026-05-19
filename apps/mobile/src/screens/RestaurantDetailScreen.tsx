import React, { useLayoutEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { HomeStackProps } from '../navigation/types';
import { api } from '../api/client';
import { Card } from '../components/Card';
import { MenuItemCartControls } from '../components/food/MenuItemCartControls';
import { useCartStore } from '../store/cartStore';
import type { MenuAddOn, MenuVariant } from '../types/menu';
import { colors } from '../theme';
import { shared } from '../theme/styles';
import { useAppInsets } from '../hooks/useAppInsets';

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  isVeg: boolean;
  variants?: MenuVariant[];
  addOns?: MenuAddOn[];
};

type RestDetail = {
  id: string;
  name: string;
  menu: MenuItem[];
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
    }});

  useLayoutEffect(() => {
    if (title) {
      navigation.setOptions({ title });
    } else if (data?.name) {
      navigation.setOptions({ title: data.name });
    }
  }, [navigation, title, data?.name]);

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

  return (
    <FlatList
      contentContainerStyle={[inset.listContent, { paddingBottom: inset.bottom + 16 }]}
      data={data.menu}
      keyExtractor={(item) => item.id}
      extraData={cartItems}
      ListHeaderComponent={
        <Pressable
          onPress={() => {
            setRestaurant(data.id, data.name);
            navigation.navigate('Cart');
          }}
          style={shared.cartLink}
        >
          <Text style={shared.cartLinkText}>
            {cartCount > 0 ? `View cart (${cartCount} items) →` : 'View cart →'}
          </Text>
        </Pressable>
      }
      renderItem={({ item }) => (
        <Card>
          <View style={shared.row}>
            <View style={{ flex: 1 }}>
              <Text style={shared.itemName}>{item.name}</Text>
              <Text style={shared.itemMeta}>
                {item.isVeg ? '🟢' : '🔴'} {item.category}
              </Text>
              <Text style={shared.price}>₹{item.price}</Text>
            </View>
            <MenuItemCartControls
              menuItemId={item.id}
              name={item.name}
              price={item.price}
              restaurantId={data.id}
              restaurantName={data.name}
              variants={item.variants ?? []}
              addOns={item.addOns ?? []}
            />
          </View>
        </Card>
      )}
    />
  );
}
