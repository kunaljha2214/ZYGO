import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchActiveRide } from '../../api/driver';
import type { DriverRide } from '../../types/driver';
import { DriverTripActiveView } from './DriverTripActiveView';
import { DriverTripIdleView } from './DriverTripIdleView';
import { colors } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DriverPartnerStackParamList } from '../../navigation/types';

/** Stack entry after accepting a request — same UI as Trip tab. */
export function DriverActiveScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<DriverPartnerStackParamList>>();
  const [ride, setRide] = useState<DriverRide | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRide(await fetchActiveRide());
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

  if (ride) {
    return (
      <DriverTripActiveView
        ride={ride}
        onRideUpdated={(updated) => {
          setRide(updated);
          if (!updated) navigation.goBack();
        }}
      />
    );
  }

  return (
    <DriverTripIdleView
      onRideHistory={() => navigation.navigate('DriverHistory')}
      onGoHub={() => navigation.navigate('DriverTabs', { screen: 'DriverHub' })}
    />
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
