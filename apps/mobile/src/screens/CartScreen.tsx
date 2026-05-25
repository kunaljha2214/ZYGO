import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import type { HomeStackProps } from '../navigation/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useCartStore } from '../store/cartStore';
import { lineKeyForCartLine } from '../store/cartLineKey';
import { shared } from '../theme/styles';
import { colors, radii, placeholderColor } from '../theme';
import { useAppInsets } from '../hooks/useAppInsets';

type Props = HomeStackProps<'Cart'>;

export function CartScreen({ navigation }: Props) {
  const inset = useAppInsets({ header: true });

  const items = useCartStore((s) => s.items);
  const restaurantName = useCartStore((s) => s.restaurantName);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const customerNotes = useCartStore((s) => s.customerNotes);
  const setCustomerNotes = useCartStore((s) => s.setCustomerNotes);
  const setQty = useCartStore((s) => s.setQty);

  const [showCooking, setShowCooking] = useState(Boolean(customerNotes.trim()));

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (!restaurantId || items.length === 0) {
    return (
      <View style={shared.empty}>
        <Text style={shared.muted}>Your cart is empty.</Text>
        <Button title="Browse food" onPress={() => navigation.navigate('RestaurantList')} />
      </View>
    );
  }

  const listFooter = (
    <View style={styles.footerExtras}>
      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionChip}
          onPress={() =>
            navigation.navigate('RestaurantDetail', {
              id: restaurantId,
              title: restaurantName ?? undefined,
            })
          }
        >
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionText}>Add Items</Text>
        </Pressable>
        <Pressable
          style={[styles.actionChip, showCooking && styles.actionChipOn]}
          onPress={() => setShowCooking((v) => !v)}
        >
          <Text style={styles.actionIcon}>✎</Text>
          <Text style={styles.actionText}>Cooking requests</Text>
        </Pressable>
      </View>

      {showCooking ? (
        <View style={styles.cookingBox}>
          <TextInput
            style={styles.cookingInput}
            value={customerNotes}
            onChangeText={setCustomerNotes}
            placeholder="Type cooking requests"
            placeholderTextColor={placeholderColor}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.cookingHint}>
            The restaurant will try their best to fulfill your request, but refund requests in
            this regard will not be possible.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={shared.flex}>
      <Text style={shared.rname}>{restaurantName}</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => lineKeyForCartLine(i)}
        contentContainerStyle={inset.listContent}
        ListFooterComponent={listFooter}
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
        <Text style={shared.muted}>
          Menu price matches the restaurant. Full bill breakdown at checkout.
        </Text>
        <Button title="Checkout" onPress={() => navigation.navigate('Checkout')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerExtras: { marginTop: 8, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    backgroundColor: colors.surface,
  },
  actionChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  actionIcon: { color: colors.text, fontSize: 16, fontWeight: '700' },
  actionText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  cookingBox: { gap: 8 },
  cookingInput: {
    minHeight: 88,
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  cookingHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
