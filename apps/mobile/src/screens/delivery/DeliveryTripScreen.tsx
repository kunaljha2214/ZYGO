import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchActiveDelivery } from '../../api/deliveryPartner';
import type { PartnerOrder } from '../../types/deliveryPartner';
import type { DeliveryPartnerStackParamList, DeliveryPartnerTabParamList } from '../../navigation/types';
import { DeliveryTripIdleView } from './DeliveryTripIdleView';
import { DeliveryTripActiveView } from './DeliveryTripActiveView';
import { colors } from '../../theme';
import { connectDeliverySocket, getDeliverySocket } from '../../services/deliverySocket';

type StackNav = NativeStackNavigationProp<DeliveryPartnerStackParamList>;
type TabNav = BottomTabNavigationProp<DeliveryPartnerTabParamList>;

export function DeliveryTripScreen() {
  const stackNav = useNavigation<StackNav>();
  const tabNav = useNavigation<TabNav>();
  const [order, setOrder] = useState<PartnerOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrder(await fetchActiveDelivery());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    const socket = getDeliverySocket() ?? connectDeliverySocket();
    const onHandoff = () => {
      void load();
    };
    const onStatus = () => void load();
    const onOtpVerified = () => void load();
    socket.on('delivery:handoff_confirmed', onHandoff);
    socket.on('delivery:status', onStatus);
    socket.on('delivery:otp_verified', onOtpVerified);
    return () => {
      socket.off('delivery:handoff_confirmed', onHandoff);
      socket.off('delivery:status', onStatus);
      socket.off('delivery:otp_verified', onOtpVerified);
    };
  }, [load]);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primaryBright} />
        <Text style={styles.bootText}>Checking your delivery…</Text>
      </View>
    );
  }

  if (order) {
    return (
      <DeliveryTripActiveView
        order={order}
        onOrderUpdated={(updated) => {
          setOrder(updated);
          if (!updated) void load();
        }}
      />
    );
  }

  return (
    <DeliveryTripIdleView
      onDeliveryHistory={() => stackNav.navigate('DeliveryHistory')}
      onGoHub={() => tabNav.navigate('DeliveryHub')}
    />
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  bootText: { color: colors.textMuted, fontSize: 14 },
});
