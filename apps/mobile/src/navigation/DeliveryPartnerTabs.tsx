import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { DeliveryPartnerTabParamList } from './types';
import { DeliveryHubScreen } from '../screens/delivery/DeliveryHubScreen';
import { DeliveryActiveScreen } from '../screens/delivery/DeliveryActiveScreen';
import { PartnerAccountScreen } from '../screens/PartnerAccountScreen';
import { tabScreenOptions } from '../theme';

const Tab = createBottomTabNavigator<DeliveryPartnerTabParamList>();

export function DeliveryPartnerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, ...tabScreenOptions }}>
      <Tab.Screen
        name="DeliveryHub"
        component={DeliveryHubScreen}
        options={{ tabBarLabel: 'Hub', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚡</Text> }}
      />
      <Tab.Screen
        name="DeliveryTrip"
        component={DeliveryActiveScreen}
        options={{ tabBarLabel: 'Trip', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚴</Text> }}
      />
      <Tab.Screen
        name="PartnerAccount"
        component={PartnerAccountScreen}
        options={{ tabBarLabel: 'Account', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}
