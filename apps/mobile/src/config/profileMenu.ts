export type ProfileMenuItemId =
  | 'help'
  | 'food_delivery'
  | 'payment'
  | 'my_rides'
  | 'my_orders'
  | 'safety'
  | 'refer'
  | 'rewards'
  | 'saved_addresses'
  | 'earnings'
  | 'wallet'
  | 'ride_history'
  | 'delivery_history'
  | 'shop_orders'
  | 'shop_menu'
  | 'shop_insights'
  | 'vehicle'
  | 'admin_approvals'
  | 'logout';

export type ProfileMenuItem = {
  id: ProfileMenuItemId;
  icon: string;
  label: string;
  subtitle?: string;
  showChevron?: boolean;
};

const REFER_ITEM: ProfileMenuItem = {
  id: 'refer',
  icon: '🎁',
  label: 'Refer and earn',
  subtitle: 'Get ₹50',
};

export function profileMenuForRole(role: string | undefined): ProfileMenuItem[] {
  switch (role) {
    case 'customer':
      return [
        { id: 'help', icon: '❓', label: 'Help' },
        { id: 'food_delivery', icon: '🍔', label: 'Food delivery' },
        { id: 'payment', icon: '💳', label: 'Payment' },
        { id: 'my_rides', icon: '🛺', label: 'My rides' },
        { id: 'my_orders', icon: '📦', label: 'My food orders' },
        { id: 'safety', icon: '🛡️', label: 'Safety' },
        REFER_ITEM,
        { id: 'rewards', icon: '🏅', label: 'My rewards' },
        { id: 'saved_addresses', icon: '📍', label: 'Saved addresses' },
      ];
    case 'driver':
      return [
        { id: 'help', icon: '❓', label: 'Help' },
        { id: 'safety', icon: '🛡️', label: 'Safety' },
        REFER_ITEM,
        { id: 'ride_history', icon: '🕐', label: 'My rides' },
        { id: 'earnings', icon: '💰', label: 'Earnings' },
        { id: 'wallet', icon: '👛', label: 'Wallet & payouts' },
        { id: 'vehicle', icon: '🚗', label: 'Vehicle', showChevron: false },
      ];
    case 'delivery_partner':
      return [
        { id: 'help', icon: '❓', label: 'Help' },
        { id: 'safety', icon: '🛡️', label: 'Safety' },
        REFER_ITEM,
        { id: 'delivery_history', icon: '🕐', label: 'Delivery history' },
        { id: 'earnings', icon: '💰', label: 'Earnings' },
        { id: 'wallet', icon: '👛', label: 'Wallet & payouts' },
      ];
    case 'shop_owner':
      return [
        { id: 'help', icon: '❓', label: 'Help' },
        REFER_ITEM,
        { id: 'shop_orders', icon: '📋', label: 'Shop orders' },
        { id: 'shop_menu', icon: '🍽️', label: 'Menu management' },
        { id: 'shop_insights', icon: '📊', label: 'Insights & offers' },
        { id: 'payment', icon: '💳', label: 'Payouts' },
      ];
    case 'admin':
      return [
        { id: 'admin_approvals', icon: '✓', label: 'Partner approvals' },
        { id: 'help', icon: '❓', label: 'Help' },
      ];
    default:
      return [{ id: 'help', icon: '❓', label: 'Help' }, REFER_ITEM];
  }
}

export function roleDisplayName(role: string | undefined): string {
  switch (role) {
    case 'customer':
      return 'Customer';
    case 'delivery_partner':
      return 'Delivery partner';
    case 'shop_owner':
      return 'Shop owner';
    case 'driver':
      return 'Ride captain';
    case 'admin':
      return 'Admin';
    default:
      return role ?? 'Zygo';
  }
}
