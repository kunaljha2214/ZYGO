import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';
import { DeliveryPartnerTabs } from './DeliveryPartnerTabs';
import { DeliveryEarningsScreen } from '../screens/delivery/DeliveryEarningsScreen';
import { DeliveryWalletScreen } from '../screens/delivery/DeliveryWalletScreen';
import { DeliveryHistoryScreen } from '../screens/delivery/DeliveryHistoryScreen';
import { DeliveryActiveScreen } from '../screens/delivery/DeliveryActiveScreen';
import { DeliveryRequestModal } from '../components/delivery/DeliveryRequestModal';
import { connectDeliverySocket } from '../services/deliverySocket';
import { useDeliveryRequestStore } from '../store/deliveryRequestStore';
import { fetchIncomingDelivery, updatePartnerLocation } from '../api/deliveryPartner';
import type { DeliveryPartnerStackParamList } from './types';
import type { DeliveryRequest } from '../types/deliveryPartner';

const Stack = createNativeStackNavigator<DeliveryPartnerStackParamList>();

/** Tabs + socket inside stack screen so navigate('DeliveryActive') resolves correctly. */
function DeliveryTabsWithSocket() {
  return (
    <View style={{ flex: 1 }}>
      <DeliveryPartnerTabs />
      <DeliverySocketLayer />
    </View>
  );
}

function DeliverySocketLayer() {
  const navigation = useNavigation<NativeStackNavigationProp<DeliveryPartnerStackParamList>>();
  const setIncoming = useDeliveryRequestStore((s) => s.setIncoming);
  const incoming = useDeliveryRequestStore((s) => s.incoming);

  useEffect(() => {
    const socket = connectDeliverySocket();

    const onRequest = (payload: DeliveryRequest) => {
      setIncoming(payload);
    };
    const onExpired = () => {
      setIncoming(null);
    };

    socket.on('delivery:request', onRequest);
    socket.on('delivery:request_expired', onExpired);
    socket.on('connect', () => {
      void pollIncoming();
    });

    const pollIncoming = async () => {
      try {
        const req = await fetchIncomingDelivery();
        if (req) setIncoming(req);
      } catch {
        /* offline or auth */
      }
    };

    void pollIncoming();
    const pollId = setInterval(() => {
      if (!incoming) void pollIncoming();
    }, 3000);

    const loc = setInterval(() => {
      Geolocation.getCurrentPosition(
        (pos) => {
          void updatePartnerLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 15000 }
      );
    }, 20000);

    return () => {
      clearInterval(pollId);
      clearInterval(loc);
      socket.off('delivery:request', onRequest);
      socket.off('delivery:request_expired', onExpired);
      socket.off('connect');
    };
  }, [setIncoming, incoming]);

  return (
    <DeliveryRequestModal
      onAccepted={() => {
        navigation.navigate('DeliveryActive');
      }}
    />
  );
}

export function DeliveryPartnerStack() {
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: true, headerTintColor: '#fff', headerStyle: { backgroundColor: '#0a0a12' } }}>
        <Stack.Screen name="DeliveryTabs" component={DeliveryTabsWithSocket} options={{ headerShown: false }} />
        <Stack.Screen name="DeliveryActive" component={DeliveryActiveScreen} options={{ title: 'Active delivery' }} />
        <Stack.Screen name="DeliveryEarnings" component={DeliveryEarningsScreen} options={{ title: 'Earnings' }} />
        <Stack.Screen name="DeliveryWallet" component={DeliveryWalletScreen} options={{ title: 'Wallet' }} />
        <Stack.Screen name="DeliveryHistory" component={DeliveryHistoryScreen} options={{ title: 'History' }} />
      </Stack.Navigator>
    </>
  );
}
