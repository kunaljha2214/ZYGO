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
import { fetchUserProfile, uploadUserProfilePhoto } from '../../api/userProfile';
import { pickImageWithChoice } from '../../utils/pickImage';
import { queryClient } from '../../queryClient';
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
  AdminAccountStackParamList,
  OrdersFilter,
} from '../../navigation/types';
import type { PartnerShellParamList } from '../../navigation/PartnerShellStack';
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
  NativeStackNavigationProp<AdminAccountStackParamList, 'AdminAccountMain'>,
  BottomTabNavigationProp<AdminTabParamList, 'AdminAccount'>
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
  const patchUser = useAuthStore((s) => s.patchUser);
  const navigation = useNavigation<CustomerNav & DriverNav & DeliveryNav & ShopNav & AdminNav>();
  const role = user?.role;

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-header'],
    queryFn: fetchUserProfile,
    enabled: !!user,
  });

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

  const openOrdersWithFilter = useCallback(
    (ordersFilter: OrdersFilter) => {
      (navigation as CustomerNav).getParent()?.navigate('Orders', {
        screen: 'OrdersList',
        params: { filter: ordersFilter },
      });
    },
    [navigation]
  );

  const uploadProfilePhoto = useCallback(async () => {
    const picked = await pickImageWithChoice();
    if (!picked) return;
    try {
      const updated = await uploadUserProfilePhoto(picked.dataUrl);
      await patchUser({ profilePhotoUrl: updated.profilePhotoUrl });
      await queryClient.invalidateQueries({ queryKey: ['user-profile-header'] });
      AppAlert.alert('Photo updated', 'Your profile picture has been saved.');
    } catch (e) {
      AppAlert.alert('Upload', e instanceof Error ? e.message : 'Could not upload photo');
    }
  }, [patchUser]);

  const openProfileDetails = useCallback(() => {
    if (role === 'customer') {
      navigation.navigate('ProfileDetails');
    } else if (role === 'driver') {
      (navigation as DriverNav).navigate('ProfileDetails');
    } else if (role === 'delivery_partner') {
      (navigation as DeliveryNav).navigate('ProfileDetails');
    } else if (role === 'shop_owner') {
      (navigation as ShopNav).navigate('ProfileDetails');
    } else if (role === 'admin') {
      (navigation as AdminNav).navigate('ProfileDetails');
    }
  }, [navigation, role]);

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
          }
          return;
        case 'food_delivery':
          if (role === 'customer') {
            openOrdersWithFilter('food');
          } else {
            navigation.getParent()?.navigate('Home', { screen: 'RestaurantList' });
          }
          return;
        case 'my_rides':
          if (role === 'customer') {
            openOrdersWithFilter('ride');
          } else {
            navigation.getParent()?.navigate('Orders');
          }
          return;
        case 'my_orders':
          if (role === 'customer') {
            openOrdersWithFilter('food');
          } else {
            navigation.getParent()?.navigate('Orders');
          }
          return;
        case 'saved_addresses':
          if (role === 'customer') {
            navigation.navigate('SavedAddresses');
          }
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
    [navigation, role, openOrdersWithFilter]
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
        profilePhotoUrl={userProfile?.profilePhotoUrl ?? user.profilePhotoUrl}
        rating={rating}
        vehicleLabel={role === 'driver' ? vehicleLabel(user.driverVehicleType) : null}
        onPressProfile={openProfileDetails}
        onPressAvatar={() => void uploadProfilePhoto()}
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
