import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { PartnerTabs } from './PartnerTabs';
import { DeliveryPartnerStack } from './DeliveryPartnerStack';
import { DriverPartnerStack } from './DriverPartnerStack';
import { useAuthStore } from '../store/authStore';
import { fetchMyRestaurantRegistration } from '../api/shopOwner';
import { fetchDeliveryProfile } from '../api/deliveryPartner';
import { fetchDriverProfile } from '../api/driver';
import type { OwnerRestaurantRegistration } from '../types/shopOwner';
import type { DeliveryPartnerProfile } from '../types/deliveryPartner';
import type { DriverProfile } from '../types/driver';
import { RestaurantRegistrationScreen } from '../screens/shop/RestaurantRegistrationScreen';
import { RegistrationStatusScreen } from '../screens/shop/RegistrationStatusScreen';
import { DeliveryRegistrationScreen } from '../screens/delivery/DeliveryRegistrationScreen';
import { DeliveryStatusScreen } from '../screens/delivery/DeliveryStatusScreen';
import { DriverRegistrationScreen } from '../screens/driver/DriverRegistrationScreen';
import { DriverStatusScreen } from '../screens/driver/DriverStatusScreen';
import { colors } from '../theme';

export function PartnerStack() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isShopOwner = user?.role === 'shop_owner';
  const isDeliveryPartner = user?.role === 'delivery_partner';
  const isDriver = user?.role === 'driver';

  if (!token) {
    return null;
  }

  const [loading, setLoading] = useState(isShopOwner || isDeliveryPartner || isDriver);
  const [registration, setRegistration] = useState<OwnerRestaurantRegistration | null>(null);
  const [deliveryProfile, setDeliveryProfile] = useState<DeliveryPartnerProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [mode, setMode] = useState<'register' | 'status' | 'app'>('app');

  const refresh = useCallback(async () => {
    if (isShopOwner) {
      setLoading(true);
      try {
        const reg = await fetchMyRestaurantRegistration();
        setRegistration(reg);
        if (!reg || reg.approvalStatus === 'draft') {
          setMode('register');
        } else if (reg.approvalStatus === 'pending_review' || reg.approvalStatus === 'rejected') {
          setMode('status');
        } else {
          setMode('app');
        }
      } catch {
        setMode('register');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isDeliveryPartner) {
      setLoading(true);
      try {
        const profile = await fetchDeliveryProfile();
        setDeliveryProfile(profile);
        if (profile.approvalStatus === 'draft') {
          setMode('register');
        } else if (profile.approvalStatus === 'pending_review' || profile.approvalStatus === 'rejected') {
          setMode('status');
        } else {
          setMode('app');
        }
      } catch {
        setMode('register');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isDriver) {
      setLoading(true);
      try {
        const profile = await fetchDriverProfile();
        setDriverProfile(profile);
        if (profile.approvalStatus === 'draft') {
          setMode('register');
        } else if (
          profile.approvalStatus === 'pending' ||
          profile.approvalStatus === 'rejected' ||
          profile.approvalStatus === 'blocked'
        ) {
          setMode('status');
        } else {
          setMode('app');
        }
      } catch {
        setMode('register');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(false);
    setMode('app');
  }, [isShopOwner, isDeliveryPartner, isDriver]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!isShopOwner && !isDeliveryPartner && !isDriver) {
    return <PartnerTabs />;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryBright} />
      </View>
    );
  }

  if (isDeliveryPartner) {
    if (mode === 'register') {
      return (
        <DeliveryRegistrationScreen
          initial={deliveryProfile}
          onSubmitted={(p) => {
            setDeliveryProfile(p);
            setMode('status');
          }}
        />
      );
    }
    if (mode === 'status' && deliveryProfile) {
      return (
        <DeliveryStatusScreen
          profile={deliveryProfile}
          onEdit={() => setMode('register')}
          onRefresh={() => void refresh()}
        />
      );
    }
    return <DeliveryPartnerStack />;
  }

  if (isDriver) {
    if (mode === 'register') {
      return (
        <DriverRegistrationScreen
          initial={driverProfile}
          onSubmitted={(p) => {
            setDriverProfile(p);
            setMode('status');
          }}
        />
      );
    }
    if (mode === 'status' && driverProfile) {
      return (
        <DriverStatusScreen
          profile={driverProfile}
          onEdit={() => setMode('register')}
          onRefresh={() => void refresh()}
        />
      );
    }
    return <DriverPartnerStack />;
  }

  if (mode === 'register') {
    return (
      <RestaurantRegistrationScreen
        initial={registration}
        onSubmitted={(reg) => {
          setRegistration(reg);
          setMode('status');
        }}
      />
    );
  }

  if (mode === 'status' && registration) {
    return (
      <RegistrationStatusScreen
        registration={registration}
        onEdit={() => setMode('register')}
        onRefresh={() => void refresh()}
      />
    );
  }

  return <PartnerTabs />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
