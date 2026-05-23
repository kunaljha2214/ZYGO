import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCartStore } from '../../store/cartStore';
import { lineKeyForCartLine } from '../../store/cartLineKey';
import type { MenuAddOn, MenuVariant } from '../../types/menu';
import { shared } from '../../theme/styles';
import { MenuItemCustomizeModal } from './MenuItemCustomizeModal';

type Props = {
  menuItemId: string;
  name: string;
  price: number;
  restaurantId: string;
  restaurantName: string;
  variants?: MenuVariant[];
  addOns?: MenuAddOn[];
};

export function MenuItemCartControls({
  menuItemId,
  name,
  price,
  restaurantId,
  restaurantName,
  variants = [],
  addOns = [],
}: Props) {
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const activeVariants = variants.filter((v) => v.name.trim() && v.price > 0);
  const needsCustomize = activeVariants.length > 0 || addOns.length > 0;

  const quantity = useCartStore((s) => {
    if (needsCustomize) {
      return s.items
        .filter((i) => i.menuItemId === menuItemId)
        .reduce((sum, i) => sum + i.quantity, 0);
    }
    return s.items.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0;
  });

  const addItem = useCartStore((s) => s.addItem);
  const setQty = useCartStore((s) => s.setQty);

  const restaurant = { id: restaurantId, name: restaurantName };

  const addLine = (line: {
    name: string;
    price: number;
    variantName?: string;
    addOnNames?: string[];
  }) => {
    addItem(
      {
        menuItemId,
        name: line.name,
        price: line.price,
        quantity: 1,
        variantName: line.variantName,
        addOnNames: line.addOnNames,
      },
      restaurant
    );
  };

  const openCustomize = () => setCustomizeOpen(true);

  if (quantity > 0 && !needsCustomize) {
    const adjustQty = (delta: number) => {
      const line = useCartStore.getState().items.find((i) => i.menuItemId === menuItemId);
      if (!line) return;
      setQty(lineKeyForCartLine(line), line.quantity + delta);
    };

    return (
      <View style={styles.wrap}>
        <View style={shared.qtyRow}>
          <Pressable
            onPress={() => adjustQty(-1)}
            style={shared.qtyBtn}
            accessibilityLabel="Decrease quantity"
          >
            <Text style={shared.qtyTxt}>−</Text>
          </Pressable>
          <Text style={shared.qtyNum}>{quantity}</Text>
          <Pressable
            onPress={() => adjustQty(1)}
            style={shared.qtyBtn}
            accessibilityLabel="Increase quantity"
          >
            <Text style={shared.qtyTxt}>+</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (quantity > 0 && needsCustomize) {
    return (
      <>
        <View style={styles.wrap}>
          <View style={shared.qtyRow}>
            <Pressable
              onPress={() => {
                const items = useCartStore.getState().items.filter((i) => i.menuItemId === menuItemId);
                const last = items[items.length - 1];
                if (last) setQty(lineKeyForCartLine(last), last.quantity - 1);
              }}
              style={shared.qtyBtn}
              accessibilityLabel="Decrease quantity"
            >
              <Text style={shared.qtyTxt}>−</Text>
            </Pressable>
            <Text style={shared.qtyNum}>{quantity}</Text>
            <Pressable
              onPress={openCustomize}
              style={shared.qtyBtn}
              accessibilityLabel="Add another"
            >
              <Text style={shared.qtyTxt}>+</Text>
            </Pressable>
          </View>
        </View>
        <MenuItemCustomizeModal
          visible={customizeOpen}
          itemName={name}
          basePrice={price}
          variants={variants}
          addOns={addOns}
          onClose={() => setCustomizeOpen(false)}
          onConfirm={(sel) =>
            addLine({
              name: sel.displayName,
              price: sel.price,
              variantName: sel.variantName,
              addOnNames: sel.addOnNames.length > 0 ? sel.addOnNames : undefined,
            })
          }
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.wrap}>
        <Pressable
          style={shared.addBtn}
          onPress={() => {
            if (needsCustomize) {
              openCustomize();
              return;
            }
            addLine({ name, price });
          }}
          accessibilityLabel={`Add ${name}`}
        >
          <Text style={shared.addBtnText}>ADD</Text>
        </Pressable>
      </View>
      {needsCustomize ? (
        <MenuItemCustomizeModal
          visible={customizeOpen}
          itemName={name}
          basePrice={price}
          variants={variants}
          addOns={addOns}
          onClose={() => setCustomizeOpen(false)}
          onConfirm={(sel) =>
            addLine({
              name: sel.displayName,
              price: sel.price,
              variantName: sel.variantName,
              addOnNames: sel.addOnNames.length > 0 ? sel.addOnNames : undefined,
            })
          }
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    alignSelf: 'center',
  },
});
