import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { AppScreen } from '../../components/layout/AppScreen';
import { ProfileHeaderCard } from '../../components/profile/ProfileHeaderCard';
import { ProfileMenuList } from '../../components/profile/ProfileMenuList';
import { Button } from '../../components/Button';
import { AppAlert } from '../../alert';
import { useAuthStore } from '../../store/authStore';
import { profileMenuForRole, roleDisplayName } from '../../config/profileMenu';
import type { ProfileMenuItemId } from '../../config/profileMenu';
import { fetchDriverProfile } from '../../api/driver';
import { fetchDeliveryProfile } from '../../api/deliveryPartner';
import { fetchDriverEarningsDashboard } from '../../api/driver';
import { fetchEarningsDashboard as fetchDeliveryEarnings } from '../../api/deliveryPartner';
import type {
  MainTabParamList,
  ProfileStackParamList,
  DriverPartnerStackParamList,
  DriverPartnerTabParamList,
  DeliveryPartnerStackParamList,
  DeliveryPartnerTabParamList,
  PartnerTabParamList,
  AdminTabParamList,
} from '../../navigation/types';
import type { PartnerShellParamList } from '../../navigation/PartnerShellStack';
import type { AdminShellParamList } from '../../navigation/AdminShellStack';
import { shared } from '../../theme/styles';

type CustomerNav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type DriverNav = CompositeNavigationProp<
  BottomTabNavigationProp<DriverPartnerTabParamList, 'PartnerAccount'>,
  NativeStackNavigationProp<DriverPartnerStackParamList>
>;

type DeliveryNav = CompositeNavigationProp<
  BottomTabNavigationProp<DeliveryPartnerTabParamList, 'PartnerAccount'>,
  NativeStackNavigationProp<DeliveryPartnerStackParamList>
>;

type ShopNav = CompositeNavigationProp<
  BottomTabNavigationProp<PartnerTabParamList, 'PartnerAccount'>,
  NativeStackNavigationProp<PartnerShellParamList>
>;
type AdminNav = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabParamList, 'AdminAccount'>,
  NativeStackNavigationProp<AdminShellParamList>
>;

function vehicleLabel(type: string | undefined | null): string | null {
  if (!type) return null;
  const labels: Record<string, string> = {
    bike: 'Bike captain',
    auto: 'Auto',
    car: 'Car',
  };
  return labels[type] ?? type;
}

export function RoleProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigation = useNavigation<CustomerNav & DriverNav & DeliveryNav & ShopNav & AdminNav>();
  const role = user?.role;

  const { data: driverProfile } = useQuery({
    queryKey: ['driver-profile-menu'],
    queryFn: fetchDriverProfile,
    enabled: role === 'driver',
  });

  const { data: deliveryProfile } = useQuery({
    queryKey: ['delivery-profile-menu'],
    queryFn: fetchDeliveryProfile,
    enabled: role === 'delivery_partner',
  });

  const { data: driverEarnings } = useQuery({
    queryKey: ['driver-earnings-menu'],
    queryFn: fetchDriverEarningsDashboard,
    enabled: role === 'driver',
  });

  const { data: deliveryEarnings } = useQuery({
    queryKey: ['delivery-earnings-menu'],
    queryFn: fetchDeliveryEarnings,
    enabled: role === 'delivery_partner',
  });

  const rating =
    role === 'driver'
      ? (driverEarnings?.rating ?? driverProfile?.rating ?? null)
      : role === 'delivery_partner'
        ? (deliveryEarnings?.rating ?? deliveryProfile?.rating ?? null)
        : null;

  const menuItems = profileMenuForRole(role).map((item) => {
    if (item.id === 'vehicle' && user?.driverVehicleType) {
      return {
        ...item,
        label: 'Vehicle',
        subtitle: vehicleLabel(user.driverVehicleType) ?? user.driverVehicleType,
        showChevron: false as const,
      };
    }
    return item;
  });

  const handleMenu = useCallback(
    (id: ProfileMenuItemId) => {
      switch (id) {
        case 'help':
          AppAlert.alert(
            'Help',
            'Email crazytoons2214@gmail.com or call support. Full help center coming soon.'
          );
          return;
        case 'safety':
          AppAlert.alert(
            'Safety',
            'Share trip details with trusted contacts. Emergency SOS coming in a future update.'
          );
          return;
        case 'payment':
        case 'rewards':
          AppAlert.alert('Coming soon', 'This feature is on our roadmap.');
          return;
        case 'refer':
          if (role === 'customer') {
            navigation.navigate('ReferAndEarn');
          } else if (role === 'driver') {
            (navigation as DriverNav).navigate('ReferAndEarn');
          } else if (role === 'delivery_partner') {
            (navigation as DeliveryNav).navigate('ReferAndEarn');
          } else if (role === 'shop_owner') {
            (navigation as ShopNav).navigate('ReferAndEarn');
          } else if (role === 'admin') {
            (navigation as AdminNav).navigate('ReferAndEarn');
          }
          return;
        case 'food_delivery':
          navigation.getParent()?.navigate('Home', { screen: 'RestaurantList' });
          return;
        case 'my_rides':
          navigation.getParent()?.navigate('Orders');
          return;
        case 'my_orders':
          navigation.getParent()?.navigate('Orders');
          return;
        case 'saved_addresses':
          navigation.navigate('SavedAddresses');
          return;
        case 'earnings':
          if (role === 'driver') {
            (navigation as DriverNav).navigate('DriverEarnings');
          } else if (role === 'delivery_partner') {
            (navigation as DeliveryNav).navigate('DeliveryEarnings');
          }
          return;
        case 'wallet':
          if (role === 'driver') {
            (navigation as DriverNav).navigate('DriverWallet');
          } else if (role === 'delivery_partner') {
            (navigation as DeliveryNav).navigate('DeliveryWallet');
          }
          return;
        case 'ride_history':
          (navigation as DriverNav).navigate('DriverHistory');
          return;
        case 'delivery_history':
          (navigation as DeliveryNav).navigate('DeliveryHistory');
          return;
        case 'shop_orders':
          (navigation as ShopNav).navigate('ShopOrders');
          return;
        case 'shop_menu':
          (navigation as ShopNav).navigate('ShopMenu');
          return;
        case 'shop_insights':
          (navigation as ShopNav).navigate('ShopInsights');
          return;
        case 'admin_approvals':
          (navigation as AdminNav).navigate('AdminApprovals');
          return;
        case 'vehicle':
          AppAlert.alert(
            'Vehicle',
            vehicleLabel(user?.driverVehicleType) ?? 'Set your vehicle during captain registration.'
          );
          return;
        default:
          return;
      }
    },
    [navigation, role]
  );

  if (!user) {
    return null;
  }

  return (
    <AppScreen scroll tab title="Profile">
      <ProfileHeaderCard
        name={user.name}
        phone={user.phone}
        roleLabel={roleDisplayName(role)}
        email={user.email}
        rating={rating}
        vehicleLabel={role === 'driver' ? vehicleLabel(user.driverVehicleType) : null}
        onPressProfile={() =>
          AppAlert.alert('Profile', 'Edit name and email coming soon.')
        }
        onPressRating={() => {
          if (role === 'driver') {
            (navigation as DriverNav).navigate('DriverEarnings');
          } else if (role === 'delivery_partner') {
            (navigation as DeliveryNav).navigate('DeliveryEarnings');
          }
        }}
      />

      <ProfileMenuList items={menuItems} onItemPress={handleMenu} />

      <View style={shared.spacer} />
      <Button title="Log out" variant="ghost" onPress={() => void logout()} />
    </AppScreen>
  );
}
