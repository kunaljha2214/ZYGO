import createError from 'http-errors';
import type { Types } from 'mongoose';
import type { IMenuItem } from '../models/MenuItem';
import { MenuItem } from '../models/MenuItem';
import type { IRestaurant } from '../models/Restaurant';

export type OrderLineInput = {
  menuItemId: string;
  quantity: number;
  variantName?: string;
  addOnNames?: string[];
};

export type BuiltOrderLine = {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
};

function resolveOrderLine(
  mi: IMenuItem,
  line: OrderLineInput
): { name: string; price: number } {
  let price = mi.price;
  let name = mi.name;

  if (line.variantName?.trim()) {
    const key = line.variantName.trim().toLowerCase();
    const variant = mi.variants.find((v) => v.name.trim().toLowerCase() === key);
    if (!variant) {
      throw createError(400, `Invalid variant "${line.variantName}" for ${mi.name}`);
    }
    price = variant.price;
    name = `${mi.name} (${variant.name})`;
  }

  const addOnNames = line.addOnNames?.filter((n) => n.trim()) ?? [];
  for (const addOnName of addOnNames) {
    const key = addOnName.trim().toLowerCase();
    const addOn = mi.addOns.find((a) => a.name.trim().toLowerCase() === key);
    if (!addOn) {
      throw createError(400, `Invalid add-on "${addOnName}" for ${mi.name}`);
    }
    price += addOn.price;
    name += ` + ${addOn.name}`;
  }

  return { name, price };
}

export async function buildOrderLines(
  restaurant: IRestaurant,
  items: OrderLineInput[]
): Promise<{ lineItems: BuiltOrderLine[]; subtotal: number; cartItemNames: string[] }> {
  const lineItems: BuiltOrderLine[] = [];
  let total = 0;

  for (const line of items) {
    const mi = await MenuItem.findOne({
      _id: line.menuItemId,
      restaurantId: restaurant._id,
      isAvailable: true,
    });
    if (!mi) {
      throw createError(400, `Invalid menu item: ${line.menuItemId}`);
    }
    const resolved = resolveOrderLine(mi, line);
    const qty = line.quantity;
    lineItems.push({
      menuItemId: mi._id,
      name: resolved.name,
      price: resolved.price,
      quantity: qty,
    });
    total += resolved.price * qty;
  }

  const subtotal = Math.round(total * 100) / 100;
  return {
    lineItems,
    subtotal,
    cartItemNames: lineItems.map((li) => li.name),
  };
}
