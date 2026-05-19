import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';
import { DriverPartnerTabs } from './DriverPartnerTabs';
import { DriverEarningsScreen } from '../screens/driver/DriverEarningsScreen';
import { DriverWalletScreen } from '../screens/driver/DriverWalletScreen';
import { DriverHistoryScreen } from '../screens/driver/DriverHistoryScreen';
import { DriverActiveScreen } from '../screens/driver/DriverActiveScreen';
import { DriverRequestModal } from '../components/driver/DriverRequestModal';
import { connectDriverSocket } from '../services/driverSocket';
import { useDriverRequestStore } from '../store/driverRequestStore';
import { fetchIncomingRide, updateDriverLocation } from '../api/driver';
import type { DriverPartnerStackParamList } from './types';
import type { RideRequest } from '../types/driver';

const Stack = createNativeStackNavigator<DriverPartnerStackParamList>();

/** Tabs + socket must live inside this screen so useNavigation targets the driver stack (not root). */
function DriverTabsWithSocket() {
  return (
    <View style={{ flex: 1 }}>
      <DriverPartnerTabs />
      <DriverSocketLayer />
    </View>
  );
}

function DriverSocketLayer() {
  const navigation = useNavigation<NativeStackNavigationProp<DriverPartnerStackParamList>>();
  const setIncoming = useDriverRequestStore((s) => s.setIncoming);
  const incoming = useDriverRequestStore((s) => s.incoming);

  useEffect(() => {
    const socket = connectDriverSocket();

    const onRequest = (payload: RideRequest) => {
      setIncoming(payload);
    };
    const onExpired = () => {
      setIncoming(null);
    };

    socket.on('ride:request', onRequest);
    socket.on('ride:request_expired', onExpired);
    socket.on('connect', () => {
      void pollIncoming();
    });

    const pollIncoming = async () => {
      try {
        const req = await fetchIncomingRide();
        if (req) setIncoming(req);
      } catch {
        /* offline */
      }
    };

    void pollIncoming();
    const pollId = setInterval(() => {
      void pollIncoming();
    }, 2500);

    const loc = setInterval(() => {
      Geolocation.getCurrentPosition(
        (pos) => {
          void updateDriverLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
      );
    }, 8000);

    return () => {
      clearInterval(pollId);
      clearInterval(loc);
      socket.off('ride:request', onRequest);
      socket.off('ride:request_expired', onExpired);
      socket.off('connect');
    };
  }, [setIncoming, incoming]);

  return (
    <DriverRequestModal
      onAccepted={() => {
        navigation.navigate('DriverActive');
      }}
    />
  );
}

export function DriverPartnerStack() {
  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: '#0a0a12' },
        }}
      >
        <Stack.Screen name="DriverTabs" component={DriverTabsWithSocket} options={{ headerShown: false }} />
        <Stack.Screen name="DriverActive" component={DriverActiveScreen} options={{ title: 'Active ride' }} />
        <Stack.Screen name="DriverEarnings" component={DriverEarningsScreen} options={{ title: 'Earnings' }} />
        <Stack.Screen name="DriverWallet" component={DriverWalletScreen} options={{ title: 'Wallet' }} />
        <Stack.Screen name="DriverHistory" component={DriverHistoryScreen} options={{ title: 'History' }} />
      </Stack.Navigator>
    </>
  );
}
