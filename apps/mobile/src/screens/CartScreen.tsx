import React from 'react';

import { View, Text, FlatList, Pressable } from 'react-native';

import type { HomeStackProps } from '../navigation/types';

import { Card } from '../components/Card';

import { Button } from '../components/Button';

import { useCartStore } from '../store/cartStore';
import { lineKeyForCartLine } from '../store/cartLineKey';

import { shared } from '../theme/styles';
import { useAppInsets } from '../hooks/useAppInsets';



type Props = HomeStackProps<'Cart'>;



export function CartScreen({ navigation }: Props) {
  const inset = useAppInsets({ header: true });

  const items = useCartStore((s) => s.items);

  const restaurantName = useCartStore((s) => s.restaurantName);

  const restaurantId = useCartStore((s) => s.restaurantId);

  const setQty = useCartStore((s) => s.setQty);



  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);



  if (!restaurantId || items.length === 0) {

    return (

      <View style={shared.empty}>

        <Text style={shared.muted}>Your cart is empty.</Text>

        <Button title="Browse food" onPress={() => navigation.navigate('RestaurantList')} />

      </View>

    );

  }



  return (

    <View style={shared.flex}>

      <Text style={shared.rname}>{restaurantName}</Text>

      <FlatList

        data={items}

        keyExtractor={(i) => lineKeyForCartLine(i)}

        contentContainerStyle={inset.listContent}

        renderItem={({ item }) => (

          <Card>

            <View style={shared.row}>

              <View style={{ flex: 1 }}>

                <Text style={shared.iname}>{item.name}</Text>

                <Text style={shared.iprice}>

                  ₹{item.price} × {item.quantity}

                </Text>

              </View>

              <View style={shared.qtyRow}>

                <Pressable
                  onPress={() => setQty(lineKeyForCartLine(item), item.quantity - 1)}
                  style={shared.qtyBtn}
                >

                  <Text style={shared.qtyTxt}>−</Text>

                </Pressable>

                <Text style={shared.qtyNum}>{item.quantity}</Text>

                <Pressable
                  onPress={() => setQty(lineKeyForCartLine(item), item.quantity + 1)}
                  style={shared.qtyBtn}
                >

                  <Text style={shared.qtyTxt}>+</Text>

                </Pressable>

              </View>

            </View>

          </Card>

        )}

      />

      <View style={shared.footer}>

        <Text style={shared.fare}>Total ₹{total.toFixed(2)}</Text>
        <Text style={shared.muted}>Coupons applied at checkout</Text>

        <Button title="Checkout" onPress={() => navigation.navigate('Checkout')} />

      </View>

    </View>

  );

}

