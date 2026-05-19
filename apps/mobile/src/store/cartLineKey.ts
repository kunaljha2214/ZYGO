import type { CartLine } from './cartStore';

/** Unique cart row id (menu item + variant + sorted add-ons). */
export function cartLineKey(
  menuItemId: string,
  variantName?: string,
  addOnNames?: string[]
): string {
  const addons =
    addOnNames && addOnNames.length > 0
      ? [...addOnNames].sort().join(',')
      : '';
  const variant = variantName?.trim() ? variantName.trim() : '';
  return [menuItemId, variant, addons].join('::');
}

export function lineKeyForCartLine(line: CartLine): string {
  return cartLineKey(line.menuItemId, line.variantName, line.addOnNames);
}
