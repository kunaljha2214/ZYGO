import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchActiveDelivery } from '../../api/deliveryPartner';
import type { PartnerOrder } from '../../types/deliveryPartner';
import type { DeliveryPartnerStackParamList } from '../../navigation/types';
import { DeliveryTripActiveView } from './DeliveryTripActiveView';
import { DeliveryTripIdleView } from './DeliveryTripIdleView';
import { colors } from '../../theme';

/** Stack screen after accepting a delivery — same UI as Trip tab. */
export function DeliveryActiveScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<DeliveryPartnerStackParamList>>();
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

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primaryBright} />
      </View>
    );
  }

  if (order) {
    return (
      <DeliveryTripActiveView
        order={order}
        onOrderUpdated={(updated) => {
          setOrder(updated);
          if (!updated) navigation.goBack();
        }}
      />
    );
  }

  return (
    <DeliveryTripIdleView
      onDeliveryHistory={() => navigation.navigate('DeliveryHistory')}
      onGoHub={() => navigation.navigate('DeliveryTabs', { screen: 'DeliveryHub' })}
    />
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
