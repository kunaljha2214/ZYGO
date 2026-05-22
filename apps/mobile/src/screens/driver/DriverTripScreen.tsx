import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchActiveRide } from '../../api/driver';
import type { DriverRide } from '../../types/driver';
import type { DriverPartnerStackParamList, DriverPartnerTabParamList } from '../../navigation/types';
import { DriverTripIdleView } from './DriverTripIdleView';
import { DriverTripActiveView } from './DriverTripActiveView';
import { colors } from '../../theme';

type StackNav = NativeStackNavigationProp<DriverPartnerStackParamList>;
type TabNav = BottomTabNavigationProp<DriverPartnerTabParamList>;

export function DriverTripScreen() {
  const stackNav = useNavigation<StackNav>();
  const tabNav = useNavigation<TabNav>();
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
        <Text style={styles.bootText}>Checking your trip…</Text>
      </View>
    );
  }

  if (ride) {
    return (
      <DriverTripActiveView
        ride={ride}
        onRideUpdated={(updated) => {
          setRide(updated);
          if (!updated) void load();
        }}
      />
    );
  }

  return (
    <DriverTripIdleView
      onRideHistory={() => stackNav.navigate('DriverHistory')}
      onGoHub={() => tabNav.navigate('DriverHub')}
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
